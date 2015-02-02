/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午4:10
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var _ = require('lodash');
//var logging = require('../logging')('esStrategy');
var Client = require('./esClient');
var tools = require('./utils');
var noop = tools.noop;

// singleton
var client;
var name = 'elasticSearch';


/**
 * ES 索引  单利
 * @param opts
 * @constructor
 */
function Strategy(opts) {
    if (opts.client) {
        client = opts.client;
    } else {
        opts = opts || {};
        client = Client.createESClient(opts);
    }
    this.name = name;
}


/**
 * 批量索引
 * @param docs
 * @param callback
 * @private
 */
Strategy.prototype._bulk4index = function (docs, callback) {
    client.bulk(docs, function (err, res) {
        if (err) {
            return callback(err);
        } else {
            callback(null, res);
        }
    });
};


/**
 * 单条索引
 * @param doc
 * @param callback
 * @private
 */
Strategy.prototype._index = function (doc, callback) {
    client.index(doc, function (err, res) {
        if (err) {
            return callback(err);
        }
        else {
            callback(null, res);
        }
    });
};


/**
 * 整理数据
 * @param opts
 * @param data
 * @returns {{index: *, type: *, id: *, body: *}}
 * @private
 */
Strategy.prototype._warp2Doc = function (opts, data) {
    if (!data) {
        throw new Error('data is must');
    }

    opts = opts || {};

    var params = {};

    _.merge(params, opts);
    if (!params.id) {
        params.id = data.id;
    }
    if (!params.body) {
        params.body = data
    }

    return params;
//    return {
//        index: opts.index,
//        type: opts.type,
//        id: data.id,
//        body: data
//    };
};


/**
 * 整理数据 2 批量
 * @param opts
 * @param datas
 * @returns {{body: Array}}
 * @private
 */
Strategy.prototype._warp2BulkDocs = function (opts, datas) {
    if (!datas) {
        throw new Error('datas is must');
    }

    var docs = [];
    _.forEach(datas, function (d) {
        var indexDocHead = {index: {_index: opts.index, _type: opts.type, _id: d.id}};
        delete d.id;
        docs.push(indexDocHead);
        docs.push(d);
    });

    return {body: docs};
};


/**
 *
 * @param opts
 * @param callback
 * @private
 */
Strategy.prototype._search = function (opts, callback) {
    opts = opts || {};

    client.search(opts, function (err, res) {
        if (err) {
            return callback(err);
        } else {
            callback(null, res);
        }
    });
};


/**
 * del
 * @param opts
 * @param callback
 * @private
 */
Strategy.prototype._del = function (opts, callback) {
    opts = opts || {};

    client.delete(opts, function (err, res) {
        if (err) {
            return callback(err);
        } else {
            callback(null, res);
        }
    });
};


/**
 * 索引
 * @param opts  {data,opts:{index,type}}
 * @param callback
 */
Strategy.prototype.save = function (opts, callback) {
    opts = opts || {};
    callback = callback || opts.callback || noop;

    var data = opts.data;
    var op = opts;
    delete op.data;

    var self = this;

    if (_.isArray(data)) {
        self._bulk4index(self._warp2BulkDocs(op, data), callback);

    } else {
        var d = self._warp2Doc(op, data);
        self._index(d, callback);
    }
};

/**
 * get by id
 * @param opts
 * @param callback
 */
Strategy.prototype.get = function (opts, callback) {
    opts = opts || {};
    callback = callback || opts.callback || noop;

    if (!opts.id) {
        throw new Error('opts.id is must.');
    }

    var q = {
        index: opts.index,
        type: opts.type,
        query: {
            match: {
                id: opts.id
            }
        }};

    this._search(q, callback);
};

/**
 * search
 * @param opts
 * @param callback
 */
Strategy.prototype.search = function (opts, callback) {

    opts = opts || {};
    callback = callback || opts.callback || noop;

    this._search({
        index: opts.index,
        type: opts.type,
        body: opts.query
    }, function (err, res) {
        if (err) {
            return callback(err);
        } else {
            callback(null, res);
        }
    });
};


Strategy.prototype.del = function (opts, callback) {
    opts = opts || {};
    callback = callback || opts.callback || noop;

    this._del({
        index: opts.index,
        type: opts.type,
        id: opts.id
    }, function (err, res) {
        if (err) {
            return callback(err);
        } else {
            callback(null, res);
        }
    });
};


/**
 * 获取 客户端对象
 * @returns {*}
 */
Strategy.prototype.getClient = function () {
    return client;
};

/**
 * 释放
 */
Strategy.prototype.close = function () {
    client.close();
    client = null;
};


/**
 * 映射
 */
Strategy.prototype.mapping = function () {

};


/**
 * 索引
 * @param opts {method,params}
 * @param callback
 */
Strategy.prototype.indices = function (opts, callback) {

    opts = opts || opts;
    callback = callback || noop;
    var method = opts.method;
    //delete opts.method;
    client.indices[method](opts.params, callback);
};


module.exports = Strategy;