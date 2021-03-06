require('babel-polyfill');

const environment = {
  development: {
    isProduction: false
  },
  production: {
    isProduction: true
  }
}[process.env.NODE_ENV || 'development'];

module.exports = Object.assign({
  host: process.env.HOST || 'localhost',
  port: process.env.PORT,
  apiHost: process.env.APIHOST || 'localhost',
  apiPort: process.env.APIPORT,
  app: {
    title: 'PA Grader',
    description: 'Web application for grading programming assignments.',
    head: {
      titleTemplate: '%s - PA Grader',
      meta: [
        {name: 'description', content: 'Web application for grading programming assignments.'},
        {charset: 'utf-8'},
        {property: 'og:site_name', content: 'PA Grader'},
        {property: 'og:image', content: 'https://react-redux.herokuapp.com/logo.jpg'},
        {property: 'og:locale', content: 'en_US'},
        {property: 'og:title', content: 'PA Grader'},
        {property: 'og:description', content: 'Web application for grading programming assignments.'},
        {property: 'og:card', content: 'summary'},
        {property: 'og:site', content: '@k2truong'},
        {property: 'og:creator', content: '@k2trong'},
        {property: 'og:image:width', content: '200'},
        {property: 'og:image:height', content: '200'}
      ]
    }
  },

}, environment);
