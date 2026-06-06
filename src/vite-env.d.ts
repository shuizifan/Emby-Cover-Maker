/// <reference types="vite/client" />

// gif.js 的 worker 脚本通过 Vite 的 ?url 后缀引入为资源 URL。
declare module '*?url' {
  const url: string;
  export default url;
}
