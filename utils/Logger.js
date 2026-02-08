const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label } = format;
var dailyRotFile = require('winston-daily-rotate-file');

const LEVELS = {
    levels: {
        error: 0,
        apires: 3,
        info: 1,
        apireq: 2
    },
    colors: {
        error: 'red',
        info: 'green',
        apires: 'green',
        apireq: 'green'

    }
};

function formatParams(info) {
    const { timestamp, level, message, label } = info;
    const ts = timestamp.slice(0, 23);

    return `${ts} [${level}] path:${label} : ${typeof message == "string" ? message : (Object.keys(message).length) ? JSON.stringify(message) : ""}`;
}

class Logger {

    /**
     * 
     * @param {String} namespace | Namespace
     */
    constructor(namespace) {
        this.namespace = namespace + '';    //type conversion
        this.logger = null;
        this.createNear2AllLogger();
        return this.logger;
    }

    createNear2AllLogger() {
        this.logger = createLogger({
            levels: LEVELS.levels,
            transports: [
                new dailyRotFile({
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: true,
                    filename: "../logs/error_%DATE%.log",
                    level: "error",
                    format: combine(label({ label: this.namespace }), this.errorFilter()(), timestamp(), format.printf(formatParams))
                }),
                new dailyRotFile({
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: true,
                    filename: "../logs/info_%DATE%.log",
                    level: 'info',
                    format: combine(label({ label: this.namespace }), this.infoFilter()(), timestamp(), format.printf(formatParams))
                }),
                new dailyRotFile({
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: true,
                    filename: "../logs/apires_%DATE%.log",
                    level: "apires",
                    format: combine(label({ label: this.namespace }), this.apiresFilter()(), timestamp(), format.printf(formatParams))
                }),
                new dailyRotFile({
                    datePattern: 'YYYY-MM-DD-HH',
                    zippedArchive: true,
                    filename: "../logs/apireq_%DATE%.log",
                    level: 'apireq',
                    format: combine(label({ label: this.namespace }), this.apireqFilter()(), timestamp(), format.printf(formatParams))
                })
            ]
        });
    }

    infoFilter() {
        return format((info, opts) => {
            return info.level === 'info' ? info : false
        })
    }
    errorFilter() {
        return format((info, opts) => {
            return info.level === 'error' ? info : false
        })
    }
    apireqFilter() {
        return format((info, opts) => {
            return info.level === 'apireq' ? info : false
        })
    }
    apiresFilter() {
        return format((info, opts) => {
            return info.level === 'apires' ? info : false
        })
    }
    exceptionFilter() {
        return format((info, opts) => {
            return info.level === 'exception' ? info : false
        })
    }
    static formatParams(...args) {
        let paramObj = {};
        paramObj.msg = args[0];
        for (let i = 1; i < args.length; i++) {
            paramObj["log" + i] = args[i];
        }
        return paramObj;
    }
}

module.exports = Logger;