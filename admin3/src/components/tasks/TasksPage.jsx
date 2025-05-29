import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Layout, Tabs, List, Input, Checkbox, Button, Tooltip, Space, Spin, Alert, Tag, message, Popconfirm, Form, DatePicker, Modal, Popover } from 'antd';
import { DeleteOutlined, CheckCircleOutlined, PhoneOutlined, PlusOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useTodos } from '../../context/TodoContext'; // Import the hook
import { useNotifications } from '../../context/NotificationContext'; // Import notification hook
import apiService from '../../services/api'; // Import API service
import dayjs from 'dayjs'; // Import dayjs for date formatting
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Title } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;
const { Text } = Typography;

const TasksPage = () => {

    const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useTodos();
    const [newTodoText, setNewTodoText] = useState('');

    // Pending Payments State & Logic
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null); // Track which item is being updated
    const [searchTerm, setSearchTerm] = useState(''); // State for search term

    // Schedule Call State
    const [scheduledCalls, setScheduledCalls] = useState([]);
    const [loadingCalls, setLoadingCalls] = useState(false);
    const [callError, setCallError] = useState(null);
    const [isCallModalVisible, setIsCallModalVisible] = useState(false);
    const [callForm] = Form.useForm();

    const { addNotification } = useNotifications(); // Get addNotification function

    const handleAddTodo = (value) => {
        if (value.trim()) {
            addTodo(value.trim());
            setNewTodoText(''); // Clear input after adding
        }
    };

    // Fetch data on mount (including scheduled calls)
    useEffect(() => {
        const fetchAllData = async () => {
            setLoadingPayments(true);
            setLoadingCalls(true);
            setPaymentError(null);
            setCallError(null);
            try {
                const [paymentsRes, callsRes] = await Promise.all([
                    apiService.getBudgetTransactions(),
                    apiService.getScheduledCalls() // Fetch non-completed calls by default
                ]);

                // Process payments
                if (paymentsRes.success && Array.isArray(paymentsRes.data)) {
                    const partials = paymentsRes.data.filter(t => t.status === 'partial').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                    setPendingPayments(partials);
                } else {
                    throw new Error(paymentsRes.message || 'Failed to fetch budget transactions');
                }

                // Process calls
                if (Array.isArray(callsRes)) {
                    setScheduledCalls(callsRes);

                    // --- Check for Overdue Calls ---
                    const now = dayjs();
                    let overdueCount = 0;
                    // Get IDs already notified about from localStorage
                    const notifiedIdsKey = 'notifiedOverdueCallIds';
                    let notifiedIds = JSON.parse(localStorage.getItem(notifiedIdsKey) || '[]');
                    let newlyNotified = false; // Flag to check if we need to update localStorage

                    callsRes.forEach(call => {
                        // Check if overdue AND not already notified
                        if (!call.isCompleted && dayjs(call.callDateTime).isBefore(now) && !notifiedIds.includes(call._id)) {
                            overdueCount++;
                            // Add a notification for each overdue call
                            addNotification({
                                type: 'OVERDUE_CALL', // Custom type for potential filtering later
                                title: 'Overdue Scheduled Call',
                                description: `Call to ${call.contactName} was due ${dayjs(call.callDateTime).fromNow()}.`,
                                // Add other relevant info if needed, e.g., link to the task
                            });
                            // Add this ID to the list and mark for update
                            notifiedIds.push(call._id);
                            newlyNotified = true;
                        }
                    });

                    // Update localStorage only if new notifications were added
                    if (newlyNotified) {
                         localStorage.setItem(notifiedIdsKey, JSON.stringify(notifiedIds));
                    }

                    if (overdueCount > 0) {
                        console.log(`Found and notified about ${overdueCount} new overdue calls.`);
                    }
                    // --- End Check ---

                } else {
                    // This case indicates an unexpected response format from apiService or backend
                    console.error('Unexpected format for scheduled calls response:', callsRes);
                    throw new Error('Received invalid data format for scheduled calls');
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                // Set specific errors or a general one
                setPaymentError(error.message.includes('budget') ? error.message : 'Could not load data.');
                setCallError(error.message.includes('call') ? error.message : 'Could not load data.');
            } finally {
                setLoadingPayments(false);
                setLoadingCalls(false);
            }
        };

        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Change dependency array to empty to run only on mount

    // Update Logic
    const handleMarkAsPaid = async (transactionId) => {
        setUpdatingId(transactionId);
        try {
            const response = await apiService.updateBudgetTransactionStatus(transactionId, 'paid');
            if (response.success) {
                message.success('Payment marked as paid successfully!');
                // Remove from list immediately
                setPendingPayments(prev => prev.filter(p => p._id !== transactionId));
                // Optional: Refetch the list to ensure consistency
                // fetchPendingPayments(); 
            } else {
                message.error(response.message || 'Failed to update payment status.');
            }
        } catch (error) {
            // Error message is likely already shown by apiService
            console.error('Error marking payment as paid:', error);
        } finally {
            setUpdatingId(null); // Clear loading state for this ID
        }
    };

    // Filtered payments based on search term
    const filteredPayments = useMemo(() => {
        if (!searchTerm) {
            return pendingPayments;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return pendingPayments.filter(item => 
            (item.teacherName?.toLowerCase().includes(lowerCaseSearch)) ||
            (item.vacancyTitle?.toLowerCase().includes(lowerCaseSearch))
        );
    }, [pendingPayments, searchTerm]);

    const GeneralTasks = () => (
        <div style={{ maxWidth: 600 }}> {/* Limit width for better readability */}
             <Input.Search
                placeholder="Add a new general task..."
                allowClear
                enterButton="Add"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onSearch={handleAddTodo}
                style={{ marginBottom: '15px' }}
            />
             <List
                bordered // Add border for better separation
                dataSource={todos}
                locale={{ emptyText: 'No general tasks yet!' }}
                renderItem={item => (
                    <List.Item
                        actions={[
                            <Tooltip title="Delete Task">
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => deleteTodo(item.id)} 
                                />
                             </Tooltip>
                        ]}
                    >
                        <Checkbox 
                            checked={item.completed}
                            onChange={() => toggleTodo(item.id)} 
                            style={{ marginRight: '10px' }}
                        />
                        <Text delete={item.completed} style={{ flex: 1 }}>
                            {item.text}
                        </Text>
                    </List.Item>
                )}
            />
             {todos.some(t => t.completed) && (
                 <Button 
                    type="link" 
                    onClick={clearCompleted}
                    style={{ marginTop: '10px'}} 
                 >
                    Clear Completed Tasks
                 </Button>
             )}
        </div>
    );

    const PendingPaymentsList = () => {
        if (loadingPayments) {
            return <Spin tip="Loading Payments..." />;
        }

        if (paymentError) {
            return <Alert message="Error" description={paymentError} type="error" showIcon />;
        }

        return (
            <div> {/* Wrap list and search in a div */}
                <Input.Search
                    placeholder="Search by Teacher Name or Vacancy Title..."
                    allowClear
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginBottom: '15px', maxWidth: '400px' }}
                />

                {filteredPayments.length === 0 && !loadingPayments ? (
                     <Alert message="No pending payments found matching your search." type="info" showIcon />
                 ) : (
                     <List
                        header={<Title level={5}>Teachers with Pending Payments ({filteredPayments.length})</Title>}
                        bordered
                        dataSource={filteredPayments} // Use filtered data
                        renderItem={item => (
                            <List.Item
                                actions={[
                                    <Popconfirm
                                        title="Mark this payment as fully paid?"
                                        onConfirm={() => handleMarkAsPaid(item._id)}
                                        okText="Yes, Mark as Paid"
                                        cancelText="No"
                                        disabled={updatingId === item._id}
                                    >
                                        <Tooltip title="Mark as Paid">
                                            <Button 
                                                type="primary"
                                                icon={<CheckCircleOutlined />} 
                                                loading={updatingId === item._id}
                                            />
                                        </Tooltip>
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    title={item.teacherName || 'Unknown Teacher'}
                                    description={
                                        <> 
                                            <div>Vacancy: {item.vacancyTitle || 'N/A'}</div>
                                            {item.teacherPhone && (
                                                <div style={{ marginTop: '4px', color: 'rgba(0, 0, 0, 0.45)', fontSize: '0.9em' }}>
                                                    <PhoneOutlined style={{ marginRight: '6px' }}/> 
                                                    {item.teacherPhone}
                                                </div>
                                            )}
                                        </>
                                    }
                                />
                                <Space direction="vertical" align="end">
                                    <Text strong>Remaining: Rs. {item.remainingAmount?.toLocaleString() || 'N/A'}</Text>
                                    {item.dueDate ? (
                                        <Text type="danger">Due: {dayjs(item.dueDate).format('DD MMM YYYY')}</Text>
                                    ) : (
                                        <Text type="secondary">No Due Date</Text>
                                    )}
                                </Space>
                            </List.Item>
                        )}
                    />
                )}
            </div>
        );
    };

    // --- Schedule Call Section --- 

    const fetchScheduledCalls = async () => {
        setLoadingCalls(true);
        setCallError(null);
        try {
            const response = await apiService.getScheduledCalls(); // Fetch non-completed
            if (response.success && Array.isArray(response.data)) {
                setScheduledCalls(response.data);
            } else {
                throw new Error(response.message || 'Failed to fetch scheduled calls');
            }
        } catch (error) {
            console.error("Error fetching scheduled calls:", error);
            setCallError(error.message || 'Could not load scheduled calls.');
        } finally {
            setLoadingCalls(false);
        }
    };

    const handleAddCall = async (values) => {
        console.log('Submitting call:', values);
        try {
            // apiService returns the new call data directly on success
            const newCall = await apiService.createScheduledCall({
                ...values,
                callDateTime: values.callDateTime.toISOString(), // Ensure ISO format
            });
            
            // If we reach here, the call succeeded. apiService throws on actual error.
            message.success('Call scheduled successfully!');
            // The 'newCall' variable IS the data we need
            setScheduledCalls(prev => [...prev, newCall].sort((a, b) => new Date(a.callDateTime) - new Date(b.callDateTime)));
            setIsCallModalVisible(false);
            callForm.resetFields();

        } catch (error) {
            // Error message handled by apiService interceptor or caught here
            console.error("Error submitting call:", error);
            // Optionally show a generic error message if apiService didn't
            // message.error('An unexpected error occurred while scheduling the call.');
        }
    };

    const handleCompleteCall = async (callId) => {
        setUpdatingId(callId); // Use updatingId for loading state
        try {
            // apiService returns the updated call data directly on success
            await apiService.updateScheduledCall(callId, { isCompleted: true });

            // If we reach here, the update succeeded.
            message.success('Call marked as complete!');
            setScheduledCalls(prev => prev.filter(call => call._id !== callId));

            // Remove from localStorage notification tracking
            const notifiedIdsKey = 'notifiedOverdueCallIds';
            let notifiedIds = JSON.parse(localStorage.getItem(notifiedIdsKey) || '[]');
            const index = notifiedIds.indexOf(callId);
            if (index > -1) {
                notifiedIds.splice(index, 1);
                localStorage.setItem(notifiedIdsKey, JSON.stringify(notifiedIds));
            }

        } catch (error) {
            console.error("Error completing call:", error);
             // Optionally show a generic error message
             // message.error('An unexpected error occurred while completing the call.');
        } finally {
             setUpdatingId(null);
        }
    };

    const handleDeleteCall = async (callId) => {
        setUpdatingId(callId);
        try {
            // apiService returns {} on successful delete, or throws an error
            await apiService.deleteScheduledCall(callId);

            // If we reach here, the delete succeeded.
            setScheduledCalls(prev => prev.filter(call => call._id !== callId));
            message.success('Scheduled call deleted successfully!');

            // Remove from localStorage notification tracking
            const notifiedIdsKey = 'notifiedOverdueCallIds';
            let notifiedIds = JSON.parse(localStorage.getItem(notifiedIdsKey) || '[]');
            const index = notifiedIds.indexOf(callId);
            if (index > -1) {
                notifiedIds.splice(index, 1);
                localStorage.setItem(notifiedIdsKey, JSON.stringify(notifiedIds));
            }

        } catch (error) {
            console.error('Error deleting scheduled call:', error);
             // Optionally show a generic error message
             // message.error('An unexpected error occurred while deleting the call.');
        } finally {
            setUpdatingId(null);
        }
    };

    const ScheduleCallSection = () => {
        if (loadingCalls) {
            return <Spin tip="Loading Scheduled Calls..." />;
        }
        if (callError) {
            return <Alert message="Error" description={callError} type="error" showIcon />;
        }

        return (
            <div>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsCallModalVisible(true)} 
                    style={{ marginBottom: 16 }}
                >
                    Schedule New Call
                </Button>
                <List
                    bordered
                    dataSource={scheduledCalls}
                    locale={{ emptyText: 'No upcoming calls scheduled.' }}
                    renderItem={item => {
                         const isPastDue = dayjs(item.callDateTime).isBefore(dayjs());
                         const timeFromNow = dayjs(item.callDateTime).fromNow();
                         
                         return (
                            <List.Item
                                actions={[
                                    <Tooltip title="Mark as Complete">
                                        <Button 
                                            type="text" 
                                            shape="circle"
                                            icon={<CheckCircleOutlined style={{ color: 'green' }} />} 
                                            onClick={() => handleCompleteCall(item._id)}
                                            loading={updatingId === item._id}
                                        />
                                    </Tooltip>,
                                    <Popconfirm
                                        title="Delete this scheduled call?"
                                        onConfirm={() => handleDeleteCall(item._id)}
                                        okText="Yes, Delete"
                                        cancelText="No"
                                        disabled={updatingId === item._id}
                                    >
                                        <Tooltip title="Delete Call">
                                            <Button 
                                                type="text" 
                                                danger 
                                                shape="circle"
                                                icon={<DeleteOutlined />} 
                                                loading={updatingId === item._id}
                                            />
                                        </Tooltip>
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    title={item.contactName}
                                    description={item.phoneNumber || 'No phone number'}
                                />
                                <Space direction="vertical" align="end">
                                     <Popover content={item.notes || 'No notes'} title="Call Notes" trigger="hover">
                                        <Text type="secondary" style={{ cursor: 'default' }}>
                                            {item.notes ? `${item.notes.substring(0, 30)}${item.notes.length > 30 ? '...' : ''}` : 'No notes'}
                                        </Text>
                                     </Popover>
                                     <Tooltip title={dayjs(item.callDateTime).format('dddd, D MMMM YYYY, h:mm A')}>
                                         <Tag 
                                            icon={<ClockCircleOutlined />} 
                                            color={isPastDue ? 'error' : 'processing'}
                                         >
                                            {timeFromNow}
                                         </Tag>
                                     </Tooltip>
                                </Space>
                            </List.Item>
                        );
                    }}
                />
            </div>
        );
    };

    return (
        <Layout style={{ padding: '24px' }}>
            <Content
                className="site-layout-background"
                style={{
                    padding: 24,
                    margin: 0,
                    minHeight: 280,
                    background: '#fff',
                }}
            >
                <Title level={2} style={{ marginBottom: '20px' }}>Tasks & Reminders</Title>
                
                <Tabs defaultActiveKey="1">
                    <TabPane tab="Schedule Call" key="1">
                        {/* Render the new section */}
                        <ScheduleCallSection />
                    </TabPane>
                    <TabPane tab="General Tasks" key="2">
                        <GeneralTasks />
                    </TabPane>
                    <TabPane tab="Pending Payments" key="3">
                        <PendingPaymentsList />
                    </TabPane>
                </Tabs>

            </Content>

            {/* Add Modal for Scheduling Call */}
            <Modal
                title="Schedule New Call"
                open={isCallModalVisible}
                onCancel={() => {
                    setIsCallModalVisible(false);
                    callForm.resetFields();
                }}
                onOk={() => callForm.submit()} // Use form's submit handler
                okText="Schedule Call"
                confirmLoading={loadingCalls} // You might want a specific loading state for the modal submit
            >
                <Form
                    form={callForm}
                    layout="vertical"
                    onFinish={handleAddCall}
                    name="schedule_call_form"
                >
                    <Form.Item
                        name="contactName"
                        label="Contact Name"
                        rules={[{ required: true, message: 'Please enter the name of the person to call' }]}
                    >
                        <Input placeholder="Enter name" />
                    </Form.Item>
                    <Form.Item
                        name="phoneNumber"
                        label="Phone Number (Optional)"
                    >
                        <Input placeholder="Enter phone number" />
                    </Form.Item>
                    <Form.Item
                        name="callDateTime"
                        label="Call Date & Time"
                        rules={[{ required: true, message: 'Please select the date and time for the call' }]}
                    >
                         <DatePicker 
                            showTime 
                            format="YYYY-MM-DD HH:mm"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="Notes (Optional)"
                    >
                        <Input.TextArea rows={3} placeholder="Add any notes about the call" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default TasksPage; 