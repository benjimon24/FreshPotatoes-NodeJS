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
      release_date: Sequelize.STRING,
			tagline: Sequelize.STRING,
			genre_id: Sequelize.INTEGER,
		}
	);

// ROUTES
app.get('/', helloWorld);
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function helloWorld(req, res) {
  Film.findOne({
    attributes: ['title', 'release_date', 'tagline'],
    where: {
      title : 'Cyborg Sobek Statistician',
    }
  }).then(function(response) {
      res.json(response);
    })
}

function getFilmRecommendations(req, res) {
  res.status(500).send('Not Implemented');
}

module.exports = app;
