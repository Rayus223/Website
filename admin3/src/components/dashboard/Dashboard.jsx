import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tabs, Spin } from 'antd';
import { UserOutlined, BookOutlined, DollarOutlined } from '@ant-design/icons';
import TeacherList from '../teachers/TeacherList';
import apiService from '../../services/api';
import { api } from '../../services/api';
import './styles.css';

const { TabPane } = Tabs;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingPayments: 0,
        parents: 0,
        teachers: 0,
        vacancies: {
            open: 0,
            closed: 0
        },
        refunds: 0
    });
    
    // Reference to TeacherList component for direct tab access
    const teacherListRef = React.createRef();

    // Fetch dashboard statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                console.log('Fetching dashboard statistics...');
                
                // Direct approach: Fetch from each necessary endpoint
                const promises = [
                    // Get parent count from ParentList
                    api.get('/api/parents/all'),
                    // Get approved teacher count from ApprovedTeacher
                    api.get('/api/teacher-apply/status/approved'),
                    // Get vacancy data from TeacherList
                    api.get('/api/vacancies'),
                    // Get budget data for refunds and pending payments
                    api.get('/api/budget/transactions')
                ];
                
                console.log('Fetching all data directly from APIs...');
                const [
                    parentsResp, 
                    teachersResp, 
                    vacanciesResp,
                    budgetResp
                ] = await Promise.all(promises);
                
                // Parse parents data specifically from ParentList
                let parents = [];
                if (parentsResp.data && parentsResp.data.data && Array.isArray(parentsResp.data.data)) {
                    parents = parentsResp.data.data;
                } else if (Array.isArray(parentsResp.data)) {
                    parents = parentsResp.data;
                }
                
                // Get approved teachers data from ApprovedTeacher
                let approvedTeachers = [];
                if (teachersResp.data && teachersResp.data.data && Array.isArray(teachersResp.data.data)) {
                    approvedTeachers = teachersResp.data.data;
                } else if (Array.isArray(teachersResp.data)) {
                    approvedTeachers = teachersResp.data;
                }
                
                // Handle vacancy data which might be in different formats
                let vacancies = [];
                if (vacanciesResp.data && Array.isArray(vacanciesResp.data)) {
                    vacancies = vacanciesResp.data;
                } else if (vacanciesResp.data && vacanciesResp.data.vacancies) {
                    vacancies = vacanciesResp.data.vacancies;
                } else if (Array.isArray(vacanciesResp)) {
                    vacancies = vacanciesResp;
                }
                
                // Process budget data for refunds and pending payments
                let budgetData = [];
                if (budgetResp.data && Array.isArray(budgetResp.data)) {
                    budgetData = budgetResp.data;
                } else if (budgetResp.data && budgetResp.data.data && Array.isArray(budgetResp.data.data)) {
                    budgetData = budgetResp.data.data;
                }
                
                console.log('Data fetched:');
                console.log(`- Parents: ${parents.length}`);
                console.log(`- Approved Teachers: ${approvedTeachers.length}`);
                console.log(`- Vacancies: ${vacancies.length}`);
                console.log(`- Budget transactions: ${budgetData.length}`);
                
                // Calculate vacancy stats from TeacherList data
                const vacancyStats = {
                    open: vacancies.filter(v => v.status === 'open').length,
                    closed: vacancies.filter(v => v.status === 'closed').length
                };
                
                // Count refunds from budget data
                const refundsCount = budgetData.filter(entry => entry.type === 'refund').length;
                
                // Calculate pending payments (partial payments)
                const pendingPaymentsCount = budgetData.filter(entry => 
                    entry.type === 'payment' && entry.status === 'partial'
                ).length;
                
                // Set all calculated stats
                const newStats = {
                    pendingPayments: pendingPaymentsCount,
                    parents: parents.length,
                    teachers: approvedTeachers.length,
                    vacancies: vacancyStats,
                    refunds: refundsCount
                };
                
                console.log('Final dashboard stats:', newStats);
                setStats(newStats);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                
                if (error.response) {
                    console.error('API error response:', error.response.data);
                    console.error('Status code:', error.response.status);
                } else if (error.request) {
                    console.error('No response received:', error.request);
                } else {
                    console.error('Error details:', error.message);
                }
                
                // Keep the default zeros if there's an error
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Function to handle clicking on the Pending Payments card
    const handlePendingPaymentsClick = () => {
        // Navigate directly to the Budget tab in TeacherList
        const tabsElement = document.querySelector('.teacher-list .ant-tabs-nav');
        if (tabsElement) {
            // Find and click the Budget tab
            const tabElements = tabsElement.querySelectorAll('.ant-tabs-tab');
            const budgetTab = Array.from(tabElements).find(
                tab => tab.textContent && tab.textContent.includes('Budget')
            );
            
            if (budgetTab) {
                budgetTab.click();
                
                // Wait for the tab to activate and render
                setTimeout(() => {
                    // Find the Status column header and click its filter icon
                    const columnHeaders = document.querySelectorAll('.ant-table-column-title');
                    const statusHeader = Array.from(columnHeaders).find(
                        header => header.textContent && header.textContent.trim() === 'Status'
                    );
                    
                    if (statusHeader) {
                        // Find the filter icon in the Status column and click it
                        const filterButton = statusHeader.closest('.ant-table-column-has-sorters')
                            ?.querySelector('.ant-table-filter-trigger');
                        
                        if (filterButton) {
                            filterButton.click();
                            
                            // Wait for dropdown to appear, then find and click "Partial Payment" option
                            setTimeout(() => {
                                const dropdownItems = document.querySelectorAll('.ant-dropdown-menu-item');
                                const partialOption = Array.from(dropdownItems).find(
                                    item => item.textContent && item.textContent.includes('Partial Payment')
                                );
                                
                                if (partialOption) {
                                    partialOption.click();
                                }
                            }, 100);
                        }
                    }
                }, 300);
            }
        }
    };

    return (
        <div className="dashboard">
            {/* TeacherList - Now placed at the top for better performance */}
            <TeacherList ref={teacherListRef} />
            
            {/* Stats sections moved to the bottom */}
            <div className="stats-section-container" style={{ marginTop: '2rem' }}>
                {/* Overview Section */}
                <div className="overview-section">
                    <h2 className="section-title">Overview</h2>
                    <div className="stats-container">
                        <div 
                            className="stat-card" 
                            onClick={handlePendingPaymentsClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-content">
                                <span className="stat-label">Pending Payments</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.pendingPayments}
                                </span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-content">
                                <span className="stat-label">Total Parents</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.parents}
                                </span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-content">
                                <span className="stat-label">Total Teachers</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.teachers}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vacancies and Refunds Section */}
                <div className="applications-section">
                    <h2 className="section-title">Vacancies and Refunds</h2>
                    <div className="stats-container">
                        <div className="stat-card status-approved">
                            <div className="stat-content">
                                <span className="stat-label">Open Vacancies</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.vacancies.open}
                                </span>
                            </div>
                        </div>
                        <div className="stat-card status-pending">
                            <div className="stat-content">
                                <span className="stat-label">Closed Vacancies</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.vacancies.closed}
                                </span>
                            </div>
                        </div>
                        <div className="stat-card status-rejected">
                            <div className="stat-content">
                                <span className="stat-label">Total Refunds</span>
                                <span className="stat-value">
                                    {loading ? <Spin size="small" /> : stats.refunds}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
