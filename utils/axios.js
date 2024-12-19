// 引入axios库  
const axios = require('axios');  


const service = axios.create({   // 添加自定义配置新的axios
    baseurl:"" ,  // 请求接口路径
    timeout: 20000 // 设置接口超时20s
})

// axios.interceptors.request.use(config =>{  // 接口请求拦截器  在请求接口前进行配置的内容

// })

service.interceptors.request.use(config =>{
    config.headers['Authorization'] ="QQBot " + process.env.access_token // 在请求头中添加参数 
    if (config.headers["Content-Type"] === "application/x-www-form-urlencoded") {
        let form = new FormData();  // 构造函数 解决传递头部参数格式不正确
        for (let key in config.data) {
          form.append(key, config.data[key]);
        }
        config.data = form
      }
    if(config.method === 'get'){  // get 请求

    }else if(config.method === 'post'){// post 请求
        //  根据真实数据进行调整
        if (config.data instanceof FormData) {    //instanceof  判断 config.data  是否是构造函数
           
        } else {
            // 第二次请求 数据会序列号 所以需要判断 解除二次序列化
            if(typeof config.data === 'string') {
                config.data = JSON.parse(config.data)
            }
        }
    } 
    return config //  请求头部抛出
},
    error =>{
        return Promise.reject(error)                 //返回一个带有拒绝原因的 Promise 对象。
    }
)  


service.interceptors.response.use(response => {   //拦截器相应之后 在响应之后对数据进行相对应的处理
    return response
},
error => {
    return Promise.reject(error)
}
)

module.exports={service}// 将这个接口拦截给抛出 让其他文件能够导入
