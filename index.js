const express = require('express'),
    mongoose = require('mongoose'),
    morgan = require('morgan'),
    methodOverride = require('method-override'),
    passport = require('passport'),
    cors = require('cors'),
    {param, matchedData, validationResult, body, checkExact, query} = require('express-validator'),
    {
        _validateUserFieldChanged,
        _valiDate,
        _checkBodyEmpty,
        _validateUsername,
        _getDocuments,
        _createDocument,
        _dynamicRouteValidation,
        _validateFavourites
    } = require('./helpers.js'),
    models = require('./models.js'),
    auth = require('./auth.js'),
    app = express(),
    movies = models.movie,
    users = models.user,
    directors = models.director,
    genres = models.genre;

mongoose.connect(process.env.CONNECTION_URI);

/**
 * @todo Fix this. CORS should not allow access from everywhere.
 */
app.use(cors());
app.use(morgan('common'));
app.use(express.static(__dirname));
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

auth(app);
require('./passport.js');

/**
 * @api {get} / Get the API documentation
 * @api {get} /directors/:name?limit Get all, a limited number or a specific director by name
 * @api {get} /genres/:name?limit Get all, a limited number or a specific genre by name
 * @api {get} /movies/:title?limit Get all, a limited number or a specific movie by title
 * @api {get} /users/:username Get all publicly available information about a user by username
 */

app.get(['/', '/directors/:name?', '/genres/:name?', '/movies/:title?', '/users/:username'], [
    param('username'),
    param('name').optional({values: 'falsy'}),
    param('title').optional({values: 'falsy'}),
    query('limit').optional({values: 'falsy'}).isInt({gt: 0}),
    checkExact([], {message: 'Request contains unknown fields.'})
], (req, res, next) => {
    if (req.path === '/') return res.sendFile(__dirname + '/documentation.html');
    switch (req.path.split('/')[1]) {
        case 'directors':
            _getDocuments(req, res, directors);
            break;
        case 'genres':
            _getDocuments(req, res, genres);
            break;
        case 'movies':
            _getDocuments(req, res, movies);
            break;
        case 'users':
            _getDocuments(req, res, users);
            break;
        default:
            next();
    }
});

/**
 * @api {post} /users Create a new user
 */
app.post('/users', [
    _checkBodyEmpty,
    _dynamicRouteValidation
], (req, res) => {
    _createDocument(req, res, users);
});

/**
 * @api {post} /directors Create a new director
 * @api {post} /genres Create a new genre
 * @api {post} /movies Create a new movie
 */
app.post(['/directors', '/genres', '/movies'], [
    passport.authenticate('jwt', {session: false}),
    _checkBodyEmpty,
    _dynamicRouteValidation
], (req, res, next) => {
    switch (req.path.split('/')[1]) {
        case 'directors':
            _createDocument(req, res, directors);
            break;
        case 'genres':
            _createDocument(req, res, genres);
            break;
        case 'movies':
            _createDocument(req, res, movies);
            break;
        default:
            next();
    }
});

/**
 * @api {delete} /users/:username Delete a user by username
 */
app.delete('/users/:username', [
    passport.authenticate('jwt', {session: false}),
    _validateUsername(param).bail({ level: 'request' }),
    param('username', 'You are not allowed to delete this user!').custom((value, {req}) => {
        return value === req.user.username;
    })
], async (req, res) => {
    try {
        validationResult(req).throw();
        const data = matchedData(req);
        if((await users.deleteOne({username: data.username})).deletedCount === 0) return res.status(404).end(data.username + ' wasn\'t found.');
        res.status(200).end(req.params.username + ' was deleted.');
    } catch (e) {
        if (Array.isArray(e.errors) && e.errors[0].msg) return res.status(422).end(e.errors[0].msg);
        return res.status(500).end('Database error: ' + e);
    }
});

/**
 * @api {patch} /users/:username Update a user by username
 */
app.patch('/users/:username', [
    passport.authenticate('jwt', {session: false}),
    _checkBodyEmpty,
    _validateUsername(param).bail({ level: 'request' }),
    param('username', 'You are not allowed to update this user!').custom((value, {req}) => { //Change this to oneOf() when super users are implemented.
        return value === req.user.username;
    }).bail({level: 'request'}),
    _validateUserFieldChanged(body, 'username').bail({level: 'request'}).optional({values: 'falsy'}),
    _validateUsername(body).bail({ level: 'request' }).optional({values: 'falsy'}),
    _validateUserFieldChanged(body, 'email').bail({level: 'request'}).optional({values: 'falsy'}),
    body('email', 'Email does not appear to be valid').isEmail().bail({level: 'request'}).normalizeEmail().optional({values: 'falsy'}),
    _validateUserFieldChanged(body, 'password').bail({level: 'request'}).optional({values: 'falsy'}),
    _validateUserFieldChanged(body, 'birthday').bail({level: 'request'}).optional({values: 'falsy'}),
    _valiDate(body, 'birthday', 'Birthday is not a vaild date').bail({level: 'request'}).optional({values: 'undefined'}),
    _validateUserFieldChanged(body, 'favourites').bail({level: 'request'}).optional(),
    _validateFavourites().optional(),
    checkExact([], {message: 'Request body contains unknown fields.'})
], async (req, res) => {
    try {
        validationResult(req).throw();
        const data = matchedData(req);
        if (data.password) data.password = users.hashPassword(data.password);
        if ((await users.updateOne({ username: req.params.username }, data)).modifiedCount === 0 ) return res.status(404).end(req.params.username + ' was not found.');
        res.status(200).end('Successfully updated user ' + req.params.username);
    } catch (e) {
        if (Array.isArray(e.errors) && e.errors[0].msg) return res.status(422).end(e.errors[0].msg);
        res.status(500).end('Database error: ' + e);
    }
});

app.use(methodOverride());
app.use((err, _, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    next();
});

const port = process.env.PORT || 8000;

app.listen(port, '0.0.0.0', () => {
    console.log('Listening on port ' + port);
});
