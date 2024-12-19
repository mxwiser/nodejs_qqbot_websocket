//引入ws
const WebSocket = require('ws');

// 引入封装的api
const {
	getAccessToken,
	getWsLink,
	rotSendMessage
} = require('./api/index');


// 心跳周期
let heartbeat_interval = 0;

// accesstoken  过期时间
let expires_in = 0;

// 周期心跳计时器
let intervalId = null;

// ws对象
let wsServer;

// 恢复链接时的session_id参数
let session_id;

let setTimeoutTimer;

// 是否要恢复链接
let restoreLink = false



// 初始化函数
async function render() {
	// 建立ws链接 获取到wsServer对象后再监听
	buildWsLinks().then(() => {
		wsServer.on('open', () => {
			console.log("链接ws服务器成功")

			//链接已建立 发送鉴权session
			// 如果restoreLink为true 则表明是恢复链接  无需再次鉴权
			if (restoreLink) {
				// 恢复链接
				// 重新链接ws服务器再发送 op：6的消息
				console.log("恢复链接", JSON.stringify({
					op: 6,
					d: {
						token: `QQBot ${process.env.access_token}`,
						session_id: session_id,
						seq: seq
					}
				}))
				wsServer.send(JSON.stringify({
					op: 6,
					d: {
						token: `QQBot ${process.env.access_token}`,
						session_id: session_id,
						seq: seq + 1
					}
				}));
				restoreLink = false
			} else {
				// 如果如果restoreLink为false 则表明是第一次登录 需要鉴权
				sendSession(`QQBot ${process.env.access_token}`);
			}

			
			// 当ws监听到错误信息 重新初始化
			wsServer.onerror = function (event) {
					const error = event.error;
					console.log("WebSocket错误描述：" + error);
					render()
			}

			wsServer.onclose = function (event) {
					console.log("链接已关闭。");
					render()
	   		}

			// 监听WebSocket消息
			wsServer.on('message', (data, isBinary) => {
				let ev = JSON.parse(data.toString())
				console.log('收到服务器内容：' + JSON.stringify(ev));
				console.log(new Date().getHours(), ":", new Date().getMinutes(), ":", new Date().getSeconds())


				// 如果ev.d && ev.d.content都存在 则表明这是用户的消息  交给processMessages函数处理
				if (ev.d && ev.d.content) {
					// 记录这次消息的群聊id
					processMessages(ev.d.content, ev.d.id,ev.d.group_openid)
				}


				// 如果有heartbeat_interval  存入心跳周期
				if (ev.d && ev.d.heartbeat_interval) {
					heartbeat_interval = ev.d.heartbeat_interval
					console.log("心跳周期", heartbeat_interval)
				}


				// 如果记录中有s字段 记录下来 恢复链接的时候要回传
				if (ev.s) {
					seq = ev.s
					console.log("seq", seq)
				}


				// 如果是首次接入 立即发送心跳
				if (ev.t && ev.t == "READY") {
					session_id = ev.d.session_id
					console.log("session_id", session_id)
					console.log("首次心跳", JSON.stringify({
						op: 1,
						d: null
					}))
					wsServer.send(JSON.stringify({
						op: 1,
						d: null
					}));

				} else {
					// 不是首次接入 周期发送心跳
					if (intervalId !== null) {
						clearInterval(intervalId); // 如果已经存在定时器，先清除它
					}
					intervalId = setInterval(() => {
						wsServer.send(JSON.stringify({
							op: 1,
							d: seq
						}));

						console.log("周期心跳", JSON.stringify({
							op: 1,
							d: seq
						}))
					}, heartbeat_interval);
				}


				if (ev.op == 7 || ev.op == 9) {
					//断线时去掉本次侦听的message事件的侦听器
					wsServer.removeListener('message', () => {
						console.log("客户端恢复连接或者客户端发送鉴权参数有错,去掉本次侦听的message事件的侦听器")
					});
					if (setTimeoutTimer !== null) {
						clearTimeout(setTimeoutTimer); // 如果已经存在定时器，先清除它
					}
					// 将restoreLink改为true  重新render的时候走恢复链接的逻辑
					restoreLink = true

					//render()

				}

			})
		})

	})
}


//调用初始化函数 
render()

// 建立ws链接
function buildWsLinks() {
	return new Promise(async (reject) => {
		// 获取调用凭证
		// access_token存入环境变量
		await anewGetAccessToken()
		// 获取ws链接
		let wsLinkData = await getWsLink()
		console.log("ws链接", wsLinkData.data)


		// 创建一个 WebSocket 连接。
		wsServer = new WebSocket(wsLinkData.data.url);
		reject(1)
	})


}

// 对接收到的消息进行处理
async function processMessages(msg, id,group_id) {
	console.log("收到用户@机器人消息:", msg, "此消息id为：", id)
	// 此处写处理消息逻辑
	//例如
	// 这个函数是在api 里面封装的 用来发文字消息的 如果需要发送图片  需要你自己另外封装
	// group_id就是群的openid
	rotSendMessage(`服务器接收到消息了，内容是${msg}`, id,group_id)
}


//   发送鉴权session
let sendSession = (token) => {
	console.log("发送鉴权信息")
	let msg = {
		op: 2,
		d: {
			token: token,
			intents: 0 | 1 << 25,
			shard: [0, 1],
			properties: {}
		}
	}
	console.log("发送鉴权session", JSON.stringify(msg))
	wsServer.send(JSON.stringify(msg))
}


// 重新调用凭证函数
function anewGetAccessToken() {
	return new Promise(async (resolve, reject) => {
		// 获取调用凭证
		let accessTokenData = await getAccessToken()

		// 将凭证存入环境变量
		process.env.access_token = accessTokenData.data.access_token
		// 赋值凭证过期时间
		expires_in = accessTokenData.data.expires_in * 1000
		if (setTimeoutTimer !== null) {
			clearTimeout(setTimeoutTimer); // 如果已经存在定时器，先清除它
		}
		// 重新覆写AccessToken
		console.log("token过期时间", accessTokenData.data)
		setTimeoutTimer = setTimeout(() => {
			// 到token过期时间之后调用自身重新获取expires_in并重置定时器
			anewGetAccessToken()
		}, expires_in)
		resolve(1)
	})

}


