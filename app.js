/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午11:44
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var config = require('config');
var App = require('./index');


var app = App.filesMoving.createFilesMoving({
    config: config
});


//console.log(app);

app.run({
    fileFullName: '/Users/ngnono/Downloads/resources.csv'
}, App.tools.consoleStdCallback);
