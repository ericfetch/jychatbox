import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import store from '../../utils/store';

// 定义AI模型配置的接口
interface AIModelConfig {
  id: string;
  name: string;
  apiKey: string;
  appId: string;
  baseUrl: string;
  modelType: string;
  isActive: boolean;
}

interface AddChatModalProps {
  visible: boolean;
  onClose: () => void;
  chatData?: any; // 添加可选的聊天数据参数
  onUpdate?: (updatedChat: any) => void; // 添加可选的更新回调
}

function AddChatModal(props: AddChatModalProps) {
  const { visible, onClose, chatData, onUpdate } = props;
  const [title, setTitle] = useState('新对话');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [appId, setAppId] = useState('');
  const [aiRole, setAiRole] = useState('');
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);
  const [model, setModel] = useState<AIModelConfig | null>(null);
  // 增加表单验证状态
  const [errors, setErrors] = useState({
    title: false,
    apiKey: false,
  });

  // 从 store 获取模型配置，并初始化表单数据
  useEffect(() => {
    const fetchModelConfigs = async () => {
      try {
        const configs = await window.electronStore.get('aiModelConfigs');
        if (configs && Array.isArray(configs)) {
          // 只获取启用状态的模型
          const activeConfigs = configs.filter((config) => config.isActive);
          setModelConfigs(activeConfigs);

          // 如果是编辑模式，使用传入的聊天数据初始化表单
          if (chatData) {
            setTitle(chatData.title || '');
            setSelectedModelId(chatData.modelId || '');
            setApiKey(chatData.apiKey || '');
            setAppId(chatData.appId || '');
            setAiRole(chatData.aiRole || '');
          } else if (activeConfigs.length > 0) {
            // 如果是新建模式且有可用的模型配置，默认选择第一个
            setSelectedModelId(activeConfigs[0].id);
            setApiKey(activeConfigs[0].apiKey || '');
            setAppId(activeConfigs[0].appId || '');
          }
        }
      } catch (error) {
        console.error('获取模型配置失败:', error);
      }
    };

    fetchModelConfigs();
  }, [visible, chatData]); // 每次对话框打开或chatData变化时重新获取

  const handleSave = () => {
    // 验证表单，appId 是可选的，不需要验证
    const newErrors = {
      title: title.trim() === '',
      apiKey: apiKey.trim() === '',
    };

    setErrors(newErrors);

    // 如果有错误，不继续执行保存
    if (newErrors.title || newErrors.apiKey) {
      return;
    }

    // 准备聊天数据对象
    const chatInfo = {
      title,
      modelType: model?.modelType,
      apiKey,
      appId,
      aiRole,
      modelId: model?.id,
    };

    // 根据模式执行不同的操作
    if (chatData && onUpdate) {
      // 编辑模式：更新现有对话
      onUpdate({
        ...chatData,
        ...chatInfo,
      });
    } else {
      // 创建模式：添加新对话
      store.chat
        .addChat(chatInfo)
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    }

    // 关闭对话框
    onClose();
  };

  // 当选择模型时，自动填充对应的API密钥和AppID
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const currentModel = modelConfigs.find((config) => config.id === modelId);
    if (currentModel) {
      setModel(currentModel);
      setApiKey(currentModel.apiKey || '');
      setAppId(currentModel.appId || '');
    }
  };

  return (
    <Dialog open={visible} onClose={onClose}>
      <DialogTitle>{chatData ? '修改对话设置' : '创建新对话'}</DialogTitle>
      <DialogContent>
        <TextField
          label="对话标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          margin="normal"
          error={errors.title}
          helperText={errors.title ? '对话标题不能为空' : ''}
          required
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>选择模型名称(配置中心自定义的)</InputLabel>
          <Select
            value={selectedModelId}
            label="选择模型名称(配置中心自定义的)"
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {modelConfigs.map((config) => (
              <MenuItem key={config.id} value={config.id}>
                {config.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="appId"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="可选"
        />
        <TextField
          label="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          fullWidth
          margin="normal"
          error={errors.apiKey}
          helperText={errors.apiKey ? 'API Key不能为空' : ''}
          required
        />
        <TextField
          label="ai角色设定"
          value={aiRole}
          placeholder="例:你是英语老师，翻译或者纠正我的错误(会影响上下文，不填则通用)"
          onChange={(e) => setAiRole(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          fullWidth
        >
          {chatData ? '更新' : '保存'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default AddChatModal;
