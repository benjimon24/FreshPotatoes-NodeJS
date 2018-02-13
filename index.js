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

  Film

// ROUTES
app.get('/films/:id', getFilm);
app.get('/films/:id/recommendations', getFilmRecommendations);

function getFilm(req, res){
  Film.findById(req.params.id).then( (film) => {
    res.json(film)
  })
}

function getFilmRecommendations(req, res) {
  let filmRecommendations = {
    recommendations: [],
    meta: {
      offset: 0,
      limit: 10
    },
  };

  Film.findById(req.params.id).then( (parentFilm) => {
      findRelatedFilms(parentFilm).then( (relatedFilms) => {
        filterByReviews(relatedFilms, (recommendedFilms) => {
          filmRecommendations.recommendations = recommendedFilms
          res.json(filmRecommendations)
        })
      })
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
    where: {
      genre_id: parent.genre_id,
      release_date: {
        $and: {
          $gt: lowerRelease,
          $lt: upperRelease
        }
      }
    }, raw: true
  })
}

function filterByReviews(films, callback){
  let filmIDs = films.map( film => film.id).join(',')
  request.get( THIRD_PARTY_API + filmIDs, (error, response, body) => {
    reviews = JSON.parse(body)

    let recommendedFilms = films.map( film => {
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

module.exports = app;
