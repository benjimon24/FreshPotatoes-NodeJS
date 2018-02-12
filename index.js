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
      release_date: Sequelize.DATE,
			tagline: Sequelize.STRING,
			genre_id: Sequelize.INTEGER,
		}, {
      timestamps: false
    }
	);

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

function filterByReviews(res, films){
  let filmIDs = relatedFilms.map( film => film.id).join(',')
  request.get( THIRD_PARTY_API + filmIDs, (error, response, body) => {
    reviews = JSON.parse(body)
    reviews = reviews.filter (review => {
      return review.reviews.length >= 5
    })
    reviews = reviews.map ( filmReviews => {
            let ratings = filmReviews.reviews.map( review => review.rating)
            filmReviews.averageRating = ratings.reduce( (sum, rating) => sum + rating) / ratings.length
            return filmReviews
    }).filter ( filmReviews => {
      return filmReviews.averageRating > 4
    })
    res.json(reviews)
  })
}


function findRelatedFilms(parent){
  // find all films matching genre and within +/- 15 years of release date, and sort them by ID
  let upperRelease = new Date(parent.release_date)
  let lowerRelease = new Date(parent.release_date)
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
    }
  }, raw: true)
}




function getFilmRecommendations(req, res) {
  Film.findById(req.params.id).then( (parentFilm) => {
      findRelatedFilms(parentFilm).then( (relatedFilms) => {
        filterByReviews(res, relatedFilms)
      })

  })

}

module.exports = app;
