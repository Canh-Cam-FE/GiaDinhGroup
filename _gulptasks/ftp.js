const gulp = require("gulp");
const ftp = require("vinyl-ftp");
require("dotenv").config();

const REMOTE_PATH =
	process.env.FTP_REMOTE_PATH || "public_html/wp-content/themes/canhcamtheme";
const FILE_GLOBS = [
	"dist/**/*.{html,css,js}",
	"dist/**/*.{svg,png,jpg,jpeg,gif,webp,mp4}",
	"dist/**/*.{woff,woff2,ttf,eot,otf}",
];

function assertEnv(name) {
	if (!process.env[name]) {
		throw new Error(
			`Missing ${name}. Copy .env.example to .env and set ${name}=...`
		);
	}
}

let conn;

function getConn() {
	if (conn) return conn;
	assertEnv("FTP_HOST");
	assertEnv("FTP_USER");
	assertEnv("FTP_PASSWORD");
	conn = ftp.create({
		host: process.env.FTP_HOST,
		user: process.env.FTP_USER,
		password: process.env.FTP_PASSWORD,
		parallel: 20,
		maxConnections: 20,
		log: false,
		idleTimeout: 30000,
		keepalive: 30000,
	});
	return conn;
}

function ftpFileDeploy() {
	return gulp
		.src(FILE_GLOBS, {
			base: "./dist",
			buffer: false,
			allowEmpty: true,
		})
		.pipe(getConn().newer(REMOTE_PATH))
		.pipe(getConn().dest(REMOTE_PATH));
}

exports.ftpFileDeploy = ftpFileDeploy;
exports.default = ftpFileDeploy;
