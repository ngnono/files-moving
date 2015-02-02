/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午3:21
 * To change this template use File | Settings | File Templates.
 */

'use strict';


function setResource(opts, callback) {
    var client = opts.client;

    client.putObject(opts.bucket, function (err, rst) {
        if(err){
            return callback(err);
        }

        return callback(null,rst);
    });
}


exports.setResource = setResource;