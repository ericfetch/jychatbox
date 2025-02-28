import './index.scss';
import { useEffect, useState } from 'react';

// const { BrowserWindow } = require('@electron/remote');

// 定义广告项的接口
interface AdItem {
  text: string;
  link: string;
}

export default function AD() {
  const [adItems, setAdItems] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从GitHub获取广告数据
    const fetchAdData = async () => {
      try {
        // 替换为你的GitHub JSON文件URL
        const response = await fetch(
          'https://raw.githubusercontent.com/你的用户名/你的仓库名/main/ads.json',
        );
        if (!response.ok) {
          throw new Error('获取广告数据失败');
        }
        const data = await response.json();
        setAdItems(data);
      } catch (err) {
        console.error('加载广告数据出错:', err);
        setError('无法加载赞助商信息');
      } finally {
        setLoading(false);
      }
    };

    fetchAdData();
  }, []);

  // 处理广告点击，打开默认浏览器
  const handleAdClick = (link: string) => {
    // const win = new BrowserWindow({ width: 800, height: 600 });
    // win.loadURL('https://github.com');
  };

  return (
    <div className="ad-container">
      <div className="ad-item">
        <span>赞助商：</span>
      </div>

      {loading ? (
        <div className="ad-item">加载中...</div>
      ) : error ? (
        <div className="ad-item error">{error}</div>
      ) : (
        adItems.map((item, index) => (
          <div
            key={index}
            className="ad-item clickable"
            onClick={() => handleAdClick(item.link)}
          >
            <span>{item.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
