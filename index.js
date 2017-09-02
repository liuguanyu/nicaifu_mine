let fs = require("fs"),
	path = require("path");

let users = require("./users");	

const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 6'];

const loginUrl = 'https://wx.nicaifu.com/login';
const waUrl = 'https://wx.nicaifu.com/wx/wa';

const aleadyEffect = "加息已生效";
const notClick = ".bonus-block";
const notEffect = "点击生效";

let baseDir = "screenshot/";

let date = new Date();
let [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(function (el){
	return el < 10 ? "0" + el : el;
});

for (let item of [year, month, day]){
	baseDir = baseDir + item + "/";

	if (!fs.existsSync(baseDir)){
		fs.mkdirSync(baseDir);
	}
}

let mine = async function (userName, password, autoValid=false) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.on('console', (...args) => {
  		for (let i =0; i < args.length; ++i)
    	console.log(`${i}: ${args[i]}`);
	});

	page.on('dialog', dialog => {
	    console.log(dialog.message());
	    dialog.dismiss();
	});

	await page.emulate(iPhone);

	await page.goto(loginUrl);

	let inputElement = await page.$('input[name=mobile]');
	await inputElement.evaluate(function (){
		document.querySelector("input[name=mobile]").value = arguments[1];

		let reg = new RegExp('(\\s|^)disabled(\\s|$)');
		let cls = document.querySelector(".big-btn").className;

		document.querySelector(".big-btn").className = cls.replace(reg, ' ');
		document.querySelector(".big-btn").click();
	}, [userName])

	await page.waitForSelector('input[name=password]');
    let passwordElement = await page.$('input[name=password]');

	await passwordElement.evaluate(function (){
		document.querySelector("input[name=password]").value = arguments[1];

		let reg = new RegExp('(\\s|^)disabled(\\s|$)');
		let cls = document.querySelector(".big-btn").className;

		document.querySelector(".big-btn").className = cls.replace(reg, ' ');

		let submitMe = async function () {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					document.getElementById("login").click();
					resolve();
				}, 3000);
			});
		}

		return submitMe();
	}, [password]);

	await page.waitForSelector('#myTargetElement');
	await page.goto(waUrl);

	await page.waitForFunction(function (){
		return (
			document.body.innerHTML.indexOf(arguments[0]) !== -1 ||
			document.querySelectorAll(arguments[1]).length == 1 || 
			document.body.innerHTML.indexOf(arguments[2]) !== -1
		);
	}, {}, aleadyEffect, notClick, notEffect);

	let ret = await page.evaluate(function (){
		let autoValid = arguments[3];
		if (document.querySelectorAll(arguments[1]).length == 1){ // 尚未挖宝
			document.querySelector(".play-go").click();

			return new Promise(function (resolve, reject){
				setTimeout(function (){
					resolve(1);
				}, 1000);
			});
		}

		if (document.body.innerHTML.indexOf(arguments[2]) !== -1 
			&& document.body.innerHTML.indexOf("马上追加充值") === -1 && autoValid){// 挖完尚未生效
			document.querySelector(".lijishengxiao").click();

			return new Promise(function (resolve, reject){
				setTimeout(function (){
					resolve(2);
				}, 1000);
			});
		}

		if (document.body.innerHTML.indexOf(arguments[0]) !== -1){
			return new Promise(function (resolve, reject){
				setTimeout(function (){
					resolve(3);
				}, 1000);
			});
		}

		return Promise.resolve(0);
	}, aleadyEffect, notClick, notEffect, autoValid);	

	if (ret == 1){ // 刚刚挖宝
		// 点击生效
		console.log("挖");
	}
	else if (ret == 2){
		console.log("待生效");
	}
	else if (ret == 3){
		console.log("已生效");
	}
	else {
		console.log("非主动生效");
	}

	await page.screenshot({
		path: baseDir + userName + '.png',
		fullPage: true
	});

	browser.close();
};


users.forEach((el) => {
	mine(el.username, el.password, el.need_auto_valid);
});
