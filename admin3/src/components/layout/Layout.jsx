import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, theme, message } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    TeamOutlined,
    UserOutlined,
    BookOutlined,
    LogoutOutlined,
    BellOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from './Header';
import './styles.css';

const { Sider, Content } = AntLayout;

const Layout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },
        {
            key: '/teachers',
            icon: <BookOutlined />,
            label: 'Teachers Applications',
            children: [
                {
                    key: '/teachers/pending',
                    label: 'Pending Applications'
                },
                {
                    key: '/teachers/approved',
                    label: 'Approved Applications'
                },
                {
                    key: '/teachers/rejected',
                    label: 'Rejected Applications'
                }
            ]
        },
        {
            key: '/students',
            icon: <TeamOutlined />,
            label: 'Students',
        },
        {
            key: '/parents',
            icon: <UserOutlined />,
            label: 'Parents',
        }
    ];

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Sider 
                trigger={null} 
                collapsible 
                collapsed={collapsed}
                className="site-layout-sider"
                breakpoint="lg"
                onBreakpoint={(broken) => {
                    if (broken) {
                        setCollapsed(true);
                    }
                }}
                style={{ 
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 10
                }}
            >
                <div className="logo">
                    {collapsed ? 'TA' : 'Tuition Admin'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={['/teachers']}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <AntLayout 
                className="site-layout"
                style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}
            >
                <Header collapsed={collapsed} toggleCollapsed={toggleCollapsed} />
                
                <Content 
                    className="site-layout-content-area" 
                    style={{ 
                        margin: '24px 16px', 
                        padding: 24, 
                        minHeight: 280,
                        overflow: 'initial'
                    }}
                >
                    <div className="content-wrapper">
                        {children}
                    </div>
                </Content>
            </AntLayout>
        </AntLayout>
    );
};

export default Layout;