import React, { useState } from 'react';
import { Layout, Button, Space, Badge, Popover, List, Typography, Avatar, Tooltip } from 'antd';
import { 
    MenuFoldOutlined, 
    MenuUnfoldOutlined, 
    BellOutlined,
    UserOutlined, 
    LogoutOutlined,
    CheckSquareOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext'; // Import context hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = ({ collapsed, toggleCollapsed }) => {
    const { logout } = useAuth();
    // Notifications
    const { notifications, unreadCount, markAllAsRead } = useNotifications(); 
    const [popoverVisible, setPopoverVisible] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate hook

    const handleLogout = () => {
        logout();
    };

    // Handler for Notification Popover
    const handleVisibleChange = (visible) => {
        setPopoverVisible(visible);
        if (visible && unreadCount > 0) {
            markAllAsRead(); 
        }
    };

    // Notification Popover Content
    const notificationContent = (
        <div style={{ width: 350 }}>
            <List
                header={<div style={{ fontWeight: 'bold', paddingBottom: '8px' }}>Notifications</div>}
                itemLayout="horizontal"
                dataSource={notifications}
                locale={{ emptyText: 'No new notifications' }}
                renderItem={item => (
                    <List.Item 
                        style={{ 
                            backgroundColor: !item.read ? '#e6f7ff' : 'transparent',
                            borderLeft: !item.read ? '4px solid #1890ff' : 'none',
                            padding: '8px 12px', 
                            transition: 'background-color 0.3s ease'
                        }}
                    >
                        <List.Item.Meta
                            title={item.title || 'Notification'}
                            description={item.description}
                        />
                        <Text type="secondary" style={{ fontSize: '0.8em', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                            {dayjs(item.timestamp).fromNow()}
                        </Text>
                    </List.Item>
                )}
            />
        </div>
    );

    return (
        <AntHeader className="site-layout-header" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            {/* Sidebar Toggle Button */}
            <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleCollapsed}
                style={{
                    fontSize: '16px',
                    width: 64,
                    height: 64,
                    marginRight: '16px' // Add some space
                }}
            />
            
            {/* Right Aligned Section */}
            <div className="header-right">
                <Space size="middle" align="center">
                    {/* Tasks Page Link Button */}
                    <Tooltip title="Tasks & Reminders">
                        <Button 
                            type="text" 
                            icon={<CheckSquareOutlined style={{ fontSize: '20px'}} />} 
                            onClick={() => navigate('/tasks')} // Add onClick handler
                        />
                    </Tooltip>

                    {/* Notification Popover Trigger */}
                    <Popover
                        content={notificationContent}
                        trigger="click"
                        open={popoverVisible}
                        onOpenChange={handleVisibleChange}
                        placement="bottomRight"
                        overlayClassName="notification-popover"
                    >
                        <span style={{ cursor: 'pointer' }}>
                            <Badge count={unreadCount} size="small">
                                <BellOutlined style={{ fontSize: '20px'}} />
                            </Badge>
                        </span>
                    </Popover>

                    {/* User Avatar */}
                    <Avatar icon={<UserOutlined />} />
                    
                    {/* Logout Button */}
                    <Button type="text" onClick={handleLogout} icon={<LogoutOutlined />}>
                        Logout
                    </Button>
                </Space>
            </div>
        </AntHeader>
    );
};

export default Header;
