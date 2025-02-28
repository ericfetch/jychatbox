import React from 'react';
import './index.css';

function WelcomeMessage() {
  return (
    <div className="welcome-message">
      <h1> 欢迎使用 JY CHATBOX</h1>
      <p>两步即可开始使用</p>
      <p>步骤一： 配置中心，添加模型应用</p>
      <p>步骤二：左下角新建对话，选择配置好的模型，点击“创建”即可。</p>
      <p className="tip">
        个人开发，完全免费，完全本地化，无需注册，无需担心隐私泄露。
      </p>
    </div>
  );
}

export default WelcomeMessage;
