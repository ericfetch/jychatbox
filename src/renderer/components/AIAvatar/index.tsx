import React from 'react';
import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import AccountCircle from '@mui/icons-material/AccountCircle';

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
  width: 40,
  height: 40,
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

function AIAvatar({ src, ...props }) {
  return (
    <StyledAvatar {...props}>
      {src ? (
        <img
          src={src}
          alt="AI Avatar"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <AccountCircle style={{ fontSize: 30 }} />
      )}
    </StyledAvatar>
  );
}

export default AIAvatar;
