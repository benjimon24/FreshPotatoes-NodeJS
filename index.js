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
// app.get('/', helloWorld);
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
// function helloWorld(req, res) {
//   Film.findOne({
//     attributes: ['title', 'release_date', 'tagline'],
//     where: {
//       title : 'Cyborg Sobek Statistician',
//     }
//   }).then( (response) => {
//       res.json(response);
//     })
// }


function getFilmRecommendations(req, res) {
  Film.findById(req.params.id).then( (paramsFilm) => {
    if (paramsFilm == null) {
      res.status(500).send("Cannot find a film matching this ID.")
    }
    else {
      let upperRelease = new Date(paramsFilm.release_date)
      let lowerRelease = new Date(paramsFilm.release_date)
      upperRelease.setFullYear(upperRelease.getFullYear() + 15)
      lowerRelease.setFullYear(lowerRelease.getFullYear() - 15)

      console.log(upperRelease)
      console.log(lowerRelease)

      Film.findAll({
        order: [ ['id', 'ASC'] ],
        where: {
          genre_id: paramsFilm.genre_id,
          release_date: {
            $and: {
              $gt: lowerRelease,
              $lt: upperRelease
            }
          }
        }
      }).then( (filmRecs) => {
        if (filmRecs == null) {
          res.status(500).send("We have no recommendations for this film.")
        }
        else {
          // let filteredRecs = filmRecs
          res.json(filmRecs)
        }
      })
    }

  })

  // request.get(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${req.params.id}`, (error, response, body) => {
  //   // console.log(req.params)
  //   // console.log('error:', error); // Print the error if one occurred
  //   // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  //   // console.log('body:', body); // Print the HTML for the Google homepage.
  //   res.json(body)
  // });
}

module.exports = app;
