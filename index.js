const sqlite = require('sqlite'),
  Sequelize = require('sequelize'),
  request = require('request'),
  express = require('express'),
  app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const THIRD_PARTY_API = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films='

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch(err => { if (NODE_ENV === 'development') console.error(err.stack); });

  var sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './db/database.db',
  });

  var Film = sequelize.define('films',
		{
			title: Sequelize.STRING,
      releaseDate: {
        type: Sequelize.DATE,
        field: 'release_date',
      },
			genre_id: Sequelize.INTEGER,
		}, {
      timestamps: false
    }
	);

  var Genre = sequelize.define('genres',
  {
    name: Sequelize.STRING,
  }, {
    timestamps: false
  })

  Film.belongsTo(Genre, {
    foreignKey: 'genre_id'
  })
  Genre.hasMany(Film, {
    foreignKey: 'genre_id'
  })

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', handleMissingRoute);

function handleMissingRoute(req, res){
  console.log(res.body)
  res.status(404).send({
    message : 'No such route exists.'
  });
}


function getFilmRecommendations(req, res) {
  let filmRecommendations = {
    recommendations: [],
    meta: {
      offset: req.query.offset || 0,
      limit: req.query.limit || 10
    },
  };

  Film.findById(req.params.id).then( (parentFilm) => {
      findRelatedFilms(parentFilm).then( (relatedFilms) => {
        filterByReviews(relatedFilms, (recommendedFilms) => {
          recommendedFilms = offsetFilms(recommendedFilms, filmRecommendations.meta.offset)
          recommendedFilms = limitFilms(recommendedFilms, filmRecommendations.meta.limit)
          filmRecommendations.recommendations = recommendedFilms
          res.json(filmRecommendations)
        })
      }).catch( (error) => {
        res.status(422).send({
          "message" : "No related films could be found."
        });
      })
  }).catch ( (error) => {
    res.status(422).send({
      "message" : "No film matches this ID."
    });
  })
}

function findRelatedFilms(parent){
  // find all films matching genre and within +/- 15 years of release date, and sort them by ID
  let upperRelease = new Date(parent.releaseDate)
  let lowerRelease = new Date(parent.releaseDate)
  upperRelease.setFullYear(upperRelease.getFullYear() + 15)
  lowerRelease.setFullYear(lowerRelease.getFullYear() - 15)

  return Film.findAll({
    order: [ ['id', 'ASC'] ],
    attributes: ['id', 'title', 'releaseDate'],
    include: {
      model: Genre,
      attributes: ['name']},
    where: {
      genre_id: parent.genre_id,
      release_date: {
        $and: {
          $gt: lowerRelease,
          $lt: upperRelease
        }
      }
    }
  })
}

function filterByReviews(films, callback){
  let filmIDs = films.map( film => film.id).join(',')
  request.get( THIRD_PARTY_API + filmIDs, (error, response, body) => {
    reviews = JSON.parse(body)

    let recommendedFilms = films.map( film => {
      film = film.toJSON();
      film.genre = film.genre.name
      film.reviews = reviews.find( review => { return review.film_id == film.id }).reviews
      return film
    }).filter (film => {
      return film.reviews.length >= 5
    }).map ( film => {
      let ratings = film.reviews.map ( review => review.rating )
      film.averageRating = Math.round((ratings.reduce( (sum, rating) => sum + rating) / ratings.length) * 100) / 100
      film.reviews = film.reviews.length
      return film
    }).filter ( film => {
      return film.averageRating > 4
    })
    callback(recommendedFilms)
  })
}

function limitFilms(films, limit){
  return films.slice(0, limit)
}

function offsetFilms(films, offset){
  return films.slice(offset, films.length)
}
module.exports = app;
