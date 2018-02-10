const sqlite = require('sqlite'),
  Sequelize = require('sequelize'),
  request = require('request'),
  express = require('express'),
  app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

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

function isHighlyRated(filmID, callback){
  // for each film, we need to see if they have atleast 5 reviews with the average rating being over 4.0

  request.get(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${filmID}`)
  // request.get(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${filmID}`, (error, response, body) => {
    // let reviews = JSON.parse(body)[0].reviews.map( (review) =>  parseInt(review.rating) )
    // let averageRating = reviews.reduce( (sum, rating) => sum + rating) / reviews.length
    // let highlyRated;
    // if (reviews.length > 5 && averageRating > 4) {
    //   highlyRated = true
    // } else {
    //   highlyRated = false
    // }
    // callback(highlyRated);
    // callback(averageRating)
  // })
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
  })
}




function getFilmRecommendations(req, res) {
  // find parent film by id from parameters
  Film.findById(req.params.id).then( (parentFilm) => {
    if (parentFilm == null) {
      // cannot find parent film
      res.status(500).send("Cannot find a film matching this ID.")
    }
    else {
      findRelatedFilms(parentFilm).then( (filmRecommendations) => {
        if (filmRecommendations == null) {
          // no matching films with genre and close release date
          res.status(500).send("We have no recommendations for this film.")
        }
        else {
          // isHighlyRated(req.params.id, (averageRating) => {test = averageRating })
          // filmRecommendations = filmRecommendations.filter((film) => {})
          res.json(filmRecommendations)
        }
      })
    }

  })

}

module.exports = app;
