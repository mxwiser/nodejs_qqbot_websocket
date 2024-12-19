const {service} = require('../utils/axios');

// 获取accessToken
module.exports.getAccessToken = () => {
	data = service({
		url: 'https://bots.qq.com/app/getAppAccessToken',
		method: 'POST',
		data: {
			appId: "写你自己的机器人的appid",
			clientSecret: "写你自己的机器人的Secret"
		}
	})
	return data;
}


// 获取ws 链接
module.exports.getWsLink = () => {
	data = service({
		url: 'https://sandbox.api.sgroup.qq.com/gateway',
		method: 'GET',
		params: {
			language: "zh"
		}
	})
	return data;
}



// 机器人发送消息
module.exports.rotSendMessage = (msg, id,group_id) => {
	let data = service({
		url: `https://api.sgroup.qq.com/v2/groups/${group_id}/messages`,
		method: 'post',
		data: {
			content: msg,
			msg_type: 0,
			msg_id: id
		}
	})
	return data;
}


