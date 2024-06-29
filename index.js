const express = require('express'),
    app = express(),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    fs = require('fs');

app.use(morgan('common'));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.send('hello, world');
});

app.get('/genres?:limit', (req, res) => {
    fs.readFile(__dirname + '/genres.json', 'utf8', (err, data) => {
        if (err) throw err;
        let genres = JSON.parse(data)['genres'];
        if (req.query['limit']) {
            const limit = Number(req.query['limit']);
            if (isNaN(limit)) throw new Error('Invalid limit');
            if (limit > 0) {
                genres = genres.slice(0, limit);
            }
            res.json({ "genres": genres });
        } else {
            res.json({ "genres": genres });
        }
    });
});

app.get('/movies?:limit', (req, res) => {
    fs.readFile(__dirname + '/movies.json', 'utf8', (err, data) => {
        if (err) throw err;
        let movies = JSON.parse(data)['movies'];
        if (req.query['limit']) {
            const limit = Number(req.query['limit']);
            if (isNaN(limit)) throw new Error('Invalid limit');
            if (limit > 0) {
                movies = movies.slice(0, limit);
            }
            res.json({ "movies": movies });
        } else {
            res.json({ "movies": movies });
        }
    });
});

app.get('/movies/:title', (req, res) => {
    console.log(req.params.title);
    fs.readFile(__dirname + '/' + req.params.title + '.json', 'utf8', (err, data) => {
        if (err) {
            console.log(err.code);
            if (err.code === 'ENOENT') {
                res.status(404).send('The movie ' + req.params.title + ' does not exist.');
            } else {
                throw err;
            }
        } else {
            res.json(JSON.parse(data));
        }
    });
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    next();
});

app.listen(8000, () => {
    console.log('Your app is listening on port 8000.');
});