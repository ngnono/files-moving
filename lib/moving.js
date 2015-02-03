/**
 * User: ngnono
 * Date: 15-1-27
 * Time: 下午4:48
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var events = require('events');
var util = require('util');
var _ = require('lodash');
var config = require('config');
var uuid = require('node-uuid');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var async = require('async');

var fetchFn = require('./fetchResource');
var tools = require('./utils');
var resourceInit = require('./sourceInit');

var ESClient = require('./esClient');
var ESStrategy = require('./esStrategy');

var setResource = require('../lib/setResource');
var OSS = require('../lib/ossClient');

var datetimeFormat = tools.datetimeFormat;// 'YYYY-MM-DDTHH:mm:ssZ';


function FilesMoving(opts) {
    /**
     * 1. 获取文件 转换为我们能识别的数据结构
     * 2. 根据中间文件结构，保存到指定设备里面
     */
    this.config = opts.config || config;

    this.esConfig = this.config.es;
    var esClient = ESClient.createESClient(this.esConfig.server);
    var esStrategy = new ESStrategy({client: esClient});
    this.strategies = {};
    this.strategies[esStrategy.name] = esStrategy;
    this.esIndex = this.esConfig.index;

    this.localResouceSavePath = this.config.local.resouceSavePath;
    tools.mkdir4sync(this.localResouceSavePath);


    var ossConfig = this.config.oss;
    this.oss = OSS.createOssClient(ossConfig);
    this.ossBucket = this.config.ossBucket;

    events.EventEmitter.call(this);
    this._init();
}

util.inherits(FilesMoving, events.EventEmitter);


/**
 * 获取远程文件
 * @param opts
 */
FilesMoving.prototype.fetchingSourceFile = function (opts) {
    console.log('--fetchingSourceFile--');
    if (!opts) {
        this.emit('error', new Error('fetchingSourceFile.opts is null'));
        return;
    }

    var datas;

    if (_.isArray(opts)) {
        datas = opts;
    } else if (_.isString(opts)) {
        datas = [opts];
    } else {
        datas = opts.resourceDatas;
    }

    var datasLength = datas.length;

    this.emit('log', {
        type: 'process',
        msg: '',
        dt: moment().format(datetimeFormat),
        info: {
            dataLength: datasLength
        }
    });

    var self = this;

    var fns = {};

    _.forEach(datas, function (fileInfo) {
        var resizes = fileInfo.resize;
        var fetchFiles = [fileInfo];

        if (resizes) {
            //resize
            _.forEach(resizes, function (s) {
                var n = {};
                _.merge(n, fileInfo);
                delete n.resize;
                n['originName'] = fileInfo.name;
                n['originExtname'] = fileInfo.extname;

                n.name = n.name + '_' + s;
                n.extname = n.resizeExtname;

                delete n.resizeExtname;

                fetchFiles.push(n);
            });
        }

        fns[fileInfo.tranId] = function (cb) {
            self._handler(fetchFiles, function (err, rst) {
                if (err) {
                    console.log(err);
                }

                cb(null, rst);
            });
        };
    });

    async.parallel(fns, function (err, results) {
        if (err) {
            console.log(err);
        }
        //再去要任务
        self.emit('requireWork', results);
    });

};


FilesMoving.prototype._handler = function (source, callback) {

    var localSavePath = this.localResouceSavePath;
    var self = this;

    var fn = function (file, cb) {

        var logFf = {};
        _.merge(logFf, file);

        delete logFf.dstStream;

        fetchFn.fetch4internet(file, function (err, rst) {
            if (err) {
                var logStruct = {
                    type: 'err',
                    method: 'fetchingSourceFile',
                    msg: '获取文件时出错',
                    err: err,
                    dt: moment().format(datetimeFormat),
                    info: logFf
                };

                self.emit('processError', logStruct);
                self.emit('log', logStruct);

                cb(null);
            }
            else {
                if (rst.statusCode === 200) {
                    var logStruct2 = {
                        type: 'fetch',
                        msg: 'fetch',
                        dt: moment().format(datetimeFormat),
                        info: logFf
                    };
                    self.emit('log', logStruct2);
                    self.fetchedSourceFile(logFf, function (err, rst) {
                        if (err) {
                            console.log(err);
                            return cb(null);
                        }

                        cb(null, rst);

                    });
                } else {
                    var logStruct3 = {
                        type: 'fetch_err',
                        msg: rst.statusCode,
                        dt: moment().format(datetimeFormat),
                        info: logFf
                    };

                    self.emit('log', logStruct3);

                    cb(null);
                }
            }
        });
    };

    var fns = [];

    _.forEach(source, function (file) {
        //当前循环 size-1
        //create fs

        var localFileFullName = localSavePath + file.prefix + file.name + '.' + file.extname;
        file['localFullPath'] = localFileFullName;
        tools.mkdir4sync(path.dirname(localFileFullName));

        var cws = fs.createWriteStream(file.localFullPath);
        file['dstStream'] = cws;

        fns.push(function (cb) {
            fn(file, cb);
        });

    });

    //err 吃掉了
    async.parallel(fns, function (err, results) {
        if (err) {
            console.log(err);
            callback(null, results);
        } else {
            callback(null, results);
        }
    });
};


/**
 * 获取远程文件后，事件
 * @param source  文件信息
 */
FilesMoving.prototype.fetchedSourceFile = function (source, callback) {

    //检查 文件是否下载OK，否则报错
    //console.log('--fetchedSourceFile--');
    var self = this;

    fs.stat(source.localFullPath, function (err) {
        //console.log(rst);
        if (err) {
            self.emit('processError',
                {
                    type: 'err',
                    msg: '文件检验失败',
                    method: 'fetchedSourceFile',
                    info: source,
                    err: err,
                    dt: moment().format(datetimeFormat)
                });

            callback(err);

        } else {
            //self.emit('save', source);

            self.saveSourceFile(source, callback);
        }
    });
};


/**
 * 保存到OSS
 * @param source 文件信息
 */
FilesMoving.prototype.saveSourceFile = function (source, callback) {

    var bucket = {};
    _.merge(bucket, this.ossBucket);

    var fileName = source.name + '.' + source.extname;
    var obj = source.prefix + fileName;

    var read = fs.createReadStream(source.localFullPath);
    var ct = mime.lookup(source.extname);

    bucket['object'] = obj;
    bucket['source'] = read;
    bucket['headers'] = {
        'Content-Type': ct
    };

    var self = this;
    setResource.setResource({
        client: this.oss,
        bucket: bucket
    }, function (err, rst) {
        if (err) {

            self.emit('processError', {
                method: 'saveSourceFile',
                type: 'err',
                msg: err,
                dt: moment().format(datetimeFormat),
                info: source
            });

            self.emit('log', {
                method: 'saveSourceFile',
                type: 'save2oss_err',
                msg: err,
                dt: moment().format(datetimeFormat),
                info: source//,
            });

            callback(err);
        }
        else {
            source['remoteFileName'] = obj;

            self.emit('log', {
                type: 'save2oss',
                dt: moment().format(datetimeFormat),
                info: source,
                method: 'saveSourceFile',
                msg: rst
            });

            self.emit('unitEnd', source);

            callback(null, source);
        }
    });
};


FilesMoving.prototype.unitEnd = function (source) {
    console.log('-----------OK---------------');
    console.log('tranId:' + source.tranId);
    console.log('sourceId:' + source.sourceId);
    console.log('sourceType:' + source.sourceType);
    console.log('file:' + source.localFullPath);
    console.log('moving:' + source.remoteFileName);
    console.log('-----------OK---------------');

};


FilesMoving.prototype.esInit = function () {

};


FilesMoving.prototype.log = function (logs) {

    var op = this.strategies['elasticSearch'];

    if (!op) {
        console.log('log is not have strategy');
        return callback(null);
    }

    var esIndex = this.esIndex;

    if (_.isObject(logs)) {
        var type = logs.type;
        var cfg = esIndex[type];

        var id;
        if (logs.id) {
            id = logs.id;
        } else {
            id = uuid.v1();

            logs['id'] = id;
        }

        if (!cfg) {
            cfg = esIndex.default;
        }

        op.save({
            data: logs,
            index: cfg.index,
            type: cfg.type
        }, function (err, rst) {
            if (err) {
                return console.error(err);
            }

            //console.log('log save');
        });

    }


};


FilesMoving.prototype.error = function (err) {
    if (err instanceof  Error) {
        return console.error(err);
    }

    console.log(err);
};


FilesMoving.prototype.processError = function (err) {
    if (err instanceof  Error) {
        return console.error(err);
    }

    console.log(err);

};


FilesMoving.prototype.sourceInit = function (opts) {

    var self = this;
    var config = self.config;
    resourceInit.readSourceFile({
        fileFullName: opts.fileFullName
    }, function (err, rst) {
        if (err) {
            self.emit('error', err);
        } else {

            var initOpts = {
                domain: config.source.internet.domain,
                prefix: config.source.prefix,
                resize: config.source.resize,
                resizeExtname: config.source.resizeExtname
            };

            var resourceDatas = resourceInit.sourceInit(rst, initOpts);

            if (!resourceDatas) {

                self.emit('error', new Error('resource init is null'));
                return;
            }

            if (resourceDatas.length === 0) {
                self.emit('error', new Error('resource init datas is 0'));
                return;
            }


            //TODO:这里控制
            //opts['resourceDatas'] = resourceDatas.slice(300000, 300050);

            var from = 0;
            var taskNum = 5;
            var to = 0;
            var totalDatas = resourceDatas.length;
            var count = 0;

            self.on('requireWork', function (lastResult) {

                console.log('________count:%s___________', count);
                if (lastResult) {
                    var keys = _.keys(lastResult);

                    console.log(keys);

                    self.emit('log', {
                        type: 'default',
                        dt: moment().format(datetimeFormat),
                        info: {
                            from: from,
                            to: to,
                            lastRst: keys
                        },
                        method: 'sourceInit'
                    });
                }

                from = to;
                to = from + taskNum;

                if (from >= totalDatas) {
                    //end
                    self.emit('end', '全部执行OK。');
                    return;
                }

                if (to > totalDatas) {
                    //最后一次
                    to = totalDatas;

                }


                console.log('________form:%s,to:%s___________', from, to);
                var taskCus = {};
                _.merge(taskCus, opts);
                taskCus['resourceDatas'] = resourceDatas.slice(from, to);

                self.emit('fetching', taskCus);
            });

            self.emit('requireWork', null);
        }
    });

};


FilesMoving.prototype._init = function () {
    this.on('resourceInit', this.sourceInit);
    this.on('fetching', this.fetchingSourceFile);
    //this.on('fetched', this.fetchedSourceFile);
    //this.on('save', this.saveSourceFile);
    this.on('unitEnd', this.unitEnd);
    this.on('log', this.log);
    this.on('error', this.error);
    this.on('processError', this.processError);
};


FilesMoving.prototype.run = function (opts, callback) {
    console.log('run..........');

    this.on('end', function (rst) {

        console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$');

        if (rst instanceof  Error) {
            return callback(rst);
        }

        return callback(null, rst);
    });

    this.emit('resourceInit', opts);
};


module.exports.createFilesMoving = function (opts) {
    var filesMoving = new FilesMoving(opts);

    return filesMoving;
};

//module.exports = FilesMoving;