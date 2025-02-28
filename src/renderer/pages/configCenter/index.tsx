import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// 定义AI模型配置的接口
interface AIModelConfig {
  id: string;
  name: string;
  apiKey: string;
  appId: string;
  baseUrl: string;
  modelType: string;
  subModel?: string;
  isActive: boolean;
}

// 定义模型选项
const MODEL_OPTIONS = [
  { value: 'gpt', label: 'GPT' },
  { value: 'aliyun', label: '阿里云百炼' },
  { value: 'tencent', label: '腾讯知识引擎' },
  { value: 'dify', label: 'Dify' },
  { value: 'ollama', label: 'Ollama' },
];

function ConfigCenter() {
  // 状态管理
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AIModelConfig | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // 表单状态
  const [formData, setFormData] = useState<Omit<AIModelConfig, 'id'>>({
    name: '',
    apiKey: '',
    appId: '',
    baseUrl: '',
    modelType: 'gpt-4',
    subModel: '',
    isActive: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 electron-store 获取数据
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const storedConfigs = await window.electronStore.get('aiModelConfigs');
        if (storedConfigs) {
          setConfigs(storedConfigs);
        } else {
          // 如果没有存储的配置，初始化一个空数组
          await window.electronStore.set('aiModelConfigs', []);
          setConfigs([]);
        }
      } catch (error) {
        console.error('获取配置失败:', error);
        setSnackbar({
          open: true,
          message: '获取配置失败',
          severity: 'error',
        });
      }
    };

    fetchConfigs();
  }, []);

  // 保存配置到 electron-store
  const saveConfigsToStore = async (updatedConfigs: AIModelConfig[]) => {
    try {
      await window.electronStore.set('aiModelConfigs', updatedConfigs);
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      setSnackbar({
        open: true,
        message: '保存配置失败',
        severity: 'error',
      });
      return false;
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
            ? Number(value)
            : value,
    });
  };

  // 打开新增对话框
  const handleOpenAddDialog = () => {
    setFormData({
      name: '',
      apiKey: '',
      appId: '',
      baseUrl: '',
      modelType: '',
      subModel: '',
      isActive: true,
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  // 打开编辑对话框
  const handleOpenEditDialog = (config: AIModelConfig) => {
    setFormData({
      name: config.name,
      apiKey: config.apiKey,
      appId: config.appId,
      baseUrl: config.baseUrl,
      modelType: config.modelType,
      subModel: config.subModel || '',
      isActive: config.isActive,
    });
    setCurrentConfig(config);
    setIsEditing(true);
    setOpenDialog(true);
  };

  // 打开删除确认对话框
  const handleOpenDeleteDialog = (config: AIModelConfig) => {
    setCurrentConfig(config);
    setOpenDeleteDialog(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOpenDeleteDialog(false);
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (formData.modelType === 'ollama' && !formData.subModel) {
      setSnackbar({
        open: true,
        message: 'Ollama 模型必须选择子模型',
        severity: 'error',
      });
      return;
    }

    if (isEditing && currentConfig) {
      // 更新现有配置
      const updatedConfigs = configs.map((config) =>
        config.id === currentConfig.id
          ? { ...formData, id: currentConfig.id }
          : config,
      );

      const success = await saveConfigsToStore(updatedConfigs);
      if (success) {
        setConfigs(updatedConfigs);
        setSnackbar({ open: true, message: '配置已更新', severity: 'success' });
        setOpenDialog(false);
      }
    } else {
      // 添加新配置
      const newConfig: AIModelConfig = {
        ...formData,
        id: Date.now().toString(), // 简单生成ID
      };

      const updatedConfigs = [...configs, newConfig];
      const success = await saveConfigsToStore(updatedConfigs);
      if (success) {
        setConfigs(updatedConfigs);
        setSnackbar({ open: true, message: '配置已添加', severity: 'success' });
        setOpenDialog(false);
      }
    }
  };

  // 删除配置
  const handleDeleteConfig = async () => {
    if (currentConfig) {
      const updatedConfigs = configs.filter(
        (config) => config.id !== currentConfig.id,
      );

      const success = await saveConfigsToStore(updatedConfigs);
      if (success) {
        setConfigs(updatedConfigs);
        setSnackbar({ open: true, message: '配置已删除', severity: 'success' });
        setOpenDeleteDialog(false);
      }
    }
  };

  // 关闭提示信息
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 导出配置到JSON文件
  const handleExportConfigs = () => {
    try {
      const configsJson = JSON.stringify(configs, null, 2);
      const blob = new Blob([configsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-model-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      setSnackbar({
        open: true,
        message: '配置已成功导出',
        severity: 'success',
      });
    } catch (error) {
      console.error('导出配置失败:', error);
      setSnackbar({
        open: true,
        message: '导出配置失败',
        severity: 'error',
      });
    }
  };

  // 触发文件选择对话框
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理导入配置
  const handleImportConfigs = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedConfigs = JSON.parse(content) as AIModelConfig[];

          // 验证导入的数据格式
          if (!Array.isArray(importedConfigs)) {
            throw new Error('导入的数据格式不正确');
          }

          // 检查每个配置是否有必要的字段
          importedConfigs.forEach((config) => {
            if (!config.id || !config.name || !config.modelType) {
              throw new Error('导入的配置数据缺少必要字段');
            }
          });

          // 保存导入的配置
          const success = await saveConfigsToStore(importedConfigs);
          if (success) {
            setConfigs(importedConfigs);
            setSnackbar({
              open: true,
              message: `成功导入 ${importedConfigs.length} 个配置`,
              severity: 'success',
            });
          }
        } catch (error) {
          console.error('解析导入文件失败:', error);
          setSnackbar({
            open: true,
            message: '导入失败: 文件格式不正确',
            severity: 'error',
          });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('导入配置失败:', error);
      setSnackbar({
        open: true,
        message: '导入配置失败',
        severity: 'error',
      });
    } finally {
      // 重置文件输入，以便可以再次选择同一文件
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">
          AI模型配置管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileUploadIcon />}
            onClick={handleImportClick}
          >
            导入配置
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportConfigs}
            disabled={configs.length === 0}
          >
            导出配置
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            添加配置
          </Button>
          {/* 隐藏的文件输入 */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImportConfigs}
          />
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>模型类型</TableCell>
              <TableCell>模型值</TableCell>
              <TableCell>AppKey</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>{config.name}</TableCell>
                <TableCell>
                  {MODEL_OPTIONS.find(
                    (option) => option.value === config.modelType,
                  )?.label || config.modelType}
                </TableCell>
                <TableCell>{config.modelType}</TableCell>
                <TableCell>{config.apiKey}</TableCell>
                <TableCell>{config.isActive ? '启用' : '禁用'}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenEditDialog(config)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleOpenDeleteDialog(config)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 添加/编辑对话框 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑配置' : '添加配置'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              margin="normal"
              label="名称"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="平台类型"
              name="modelType"
              select
              SelectProps={{ native: true }}
              value={formData.modelType}
              onChange={handleInputChange}
              required
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              label="API密钥"
              name="apiKey"
              helperText="选择ollama时，apikey随便写，本地调用不需要"
              value={formData.apiKey}
              onChange={handleInputChange}
              required
              type="password"
            />
            <TextField
              fullWidth
              margin="normal"
              label="AppID (可选)"
              name="appId"
              value={formData.appId}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="API基础URL (可选)"
              name="baseUrl"
              placeholder={`${formData.modelType === 'ollama' ? '默认：http://localhost:11434' : ''}`}
              value={formData.baseUrl}
              onChange={handleInputChange}
            />
            {formData.modelType === 'ollama' && (
              <TextField
                fullWidth
                margin="normal"
                label="子模型"
                name="subModel"
                value={formData.subModel || ''}
                onChange={handleInputChange}
                required
                helperText="请选择 Ollama 的具体子模型"
              />
            )}
            <TextField
              fullWidth
              margin="normal"
              label="状态"
              name="isActive"
              select
              SelectProps={{ native: true }}
              value={formData.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isActive: e.target.value === 'true',
                })
              }
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button
            onClick={handleSaveConfig}
            variant="contained"
            color="primary"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要删除 "{currentConfig?.name}" 配置吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleDeleteConfig} color="error">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示信息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ConfigCenter;
