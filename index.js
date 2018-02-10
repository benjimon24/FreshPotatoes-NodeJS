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

function getFilmRecommendations(req, res) {
  // find parent film by id from parameters
  Film.findById(req.params.id).then( (parentFilm) => {
    if (parentFilm == null) {
      // cannot find parent film
      res.status(500).send("Cannot find a film matching this ID.")
    }
    else {
      // find all films matching genre and within +/- 15 years of release date
      let upperRelease = new Date(parentFilm.release_date)
      let lowerRelease = new Date(parentFilm.release_date)
      upperRelease.setFullYear(upperRelease.getFullYear() + 15)
      lowerRelease.setFullYear(lowerRelease.getFullYear() - 15)

      console.log(upperRelease)
      console.log(lowerRelease)

      Film.findAll({
        order: [ ['id', 'ASC'] ],
        where: {
          genre_id: parentFilm.genre_id,
          release_date: {
            $and: {
              $gt: lowerRelease,
              $lt: upperRelease
            }
          }
        }
      }).then( (filmRecs) => {
        if (filmRecs == null) {
          // no matching films with genre and close release date
          res.status(500).send("We have no recommendations for this film.")
        }
        else {
          // for each film, we need to see if they have atleast 5 reviews with the average rating being over 4.0
          request.get(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${req.params.id}`, (error, response, body) => {
            // console.log(req.params)
            // console.log('error:', error); // Print the error if one occurred
            // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            // console.log('body:', body); // Print the HTML for the Google homepage.
            
            reviews = JSON.parse(body)[0].reviews
            if (reviews == []) {
              res.status(500).send("We cannot find any reviews for this film")
            } else {
              console.log(filmRecs.length)
              console.log(reviews.length)
              res.json(reviews)
              // let filteredRecs = filmRecs
            }
          });
        }
      })
    }

  })

}

module.exports = app;
