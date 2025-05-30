import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Space, Button, message, Modal, Tooltip, Tag, Switch, Popconfirm } from 'antd';
import { EyeOutlined, DeleteOutlined, ExclamationCircleOutlined, PlusCircleOutlined, RestOutlined, UndoOutlined } from '@ant-design/icons';
import apiService from '../../services/api';

const { confirm } = Modal;

const ParentList = () => {
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedParent, setSelectedParent] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [showTrash, setShowTrash] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const navigate = useNavigate();

    // Add table change handler
    const handleTableChange = (pagination, filters, sorter) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

     // Add useEffect to fetch data when component mounts
     useEffect(() => {
        fetchParents();
    }, [showTrash]);

    const fetchParents = async () => {
        try {
            // Update the endpoint to fetch either active or trashed parents
            const endpoint = showTrash 
                ? 'https://api.dearsirhometuition.com/api/parents/trash'
                : 'https://api.dearsirhometuition.com/api/parents/all';
            
            const response = await fetch(endpoint);
            const data = await response.json();
            if (data.success) {
                setParents(data.data);
            } else {
                message.error('Failed to fetch parents: ' + data.message);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            message.error('Failed to fetch parents');
        } finally {
            setLoading(false);
        }
    };

    const showDeleteConfirm = (record) => {
        confirm({
            title: showTrash 
                ? 'Are you sure you want to permanently delete this application?' 
                : 'Are you sure you want to move this application to trash?',
            icon: <ExclamationCircleOutlined />,
            content: showTrash
                ? `This will permanently delete ${record.parentName}'s application and cannot be undone.`
                : `${record.parentName}'s application will be moved to trash.`,
            okText: showTrash ? 'Yes, Delete Permanently' : 'Yes, Move to Trash',
            okType: 'danger',
            cancelText: 'No, Cancel',
            onOk() {
                return showTrash ? handlePermanentDelete(record._id) : handleMoveToTrash(record._id);
            },
            onCancel() {
                // Do nothing on cancel
            },
        });
    };

    const handleMoveToTrash = async (id) => {
        try {
            const response = await fetch(`https://api.dearsirhometuition.com/api/parents/${id}/trash`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trashed: true })
            });
            
            const data = await response.json();
            
            if (data.success) {
                message.success('Parent application moved to trash');
                fetchParents();
            } else {
                message.error('Failed to move parent application to trash: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            message.error('Failed to move parent application to trash');
        }
    };

    const handlePermanentDelete = async (id) => {
        try {
            const response = await fetch(`https://api.dearsirhometuition.com/api/parents/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                message.success('Parent application permanently deleted');
                fetchParents();
            } else {
                message.error('Failed to delete parent application: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            message.error('Failed to delete parent application');
        }
    };

    const handleRestore = async (id) => {
        try {
            const response = await fetch(`https://api.dearsirhometuition.com/api/parents/${id}/restore`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trashed: false })
            });
            
            const data = await response.json();
            
            if (data.success) {
                message.success('Parent application restored');
                fetchParents();
            } else {
                message.error('Failed to restore parent application: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            message.error('Failed to restore parent application');
        }
    };

    const handleCreateVacancy = async (record) => {
        try {
            // Get formatted gender from parent's preferredTeacher
            const gender = record.preferredTeacher === 'any' ? 'Any' : 
                           record.preferredTeacher === 'male' ? 'Male' : 'Female';
            
            // Fetch all vacancies to find the latest title number
            const allVacancies = await apiService.getAllVacancies();
            
            // Extract the highest vacancy number (format: "Vacancy D##" or "Vacancy ##")
            let highestNumber = 0;
            const PREFIX = 'Vacancy D'; // Change this if your prefix is different
            
            allVacancies.forEach(vacancy => {
                if (vacancy.title && vacancy.title.startsWith('Vacancy')) {
                    // Check for both formats: "Vacancy D##" and "Vacancy ##"
                    let numberStr;
                    
                    if (vacancy.title.startsWith(PREFIX)) {
                        // Format: "Vacancy D##"
                        numberStr = vacancy.title.substring(PREFIX.length);
                    } else {
                        // Format: "Vacancy ##"
                        numberStr = vacancy.title.substring('Vacancy '.length);
                    }
                    
                    // Parse the number if it exists
                    if (numberStr && !isNaN(parseInt(numberStr))) {
                        const vacancyNumber = parseInt(numberStr);
                        if (vacancyNumber > highestNumber) {
                            highestNumber = vacancyNumber;
                        }
                    }
                }
            });
            
            // Generate the next vacancy title with incremented number
            const nextNumber = highestNumber + 1;
            const newTitle = `${PREFIX}${nextNumber}`;
            
            console.log(`Generated new vacancy title: ${newTitle} (previous highest: ${highestNumber})`);
            
            // Create vacancy data object with updated field mappings
            const vacancyData = {
                title: newTitle, // Use the generated title instead of application number
                subject: Array.isArray(record.subjects) ? record.subjects.join(', ') : record.subjects,
                // Map parent form fields to vacancy form fields
                class: record.grade, // Use grade as class
                time: record.preferredTime, // Use preferredTime directly
                location: record.address, // Use address as location
                gender: record.preferredTeacher.toLowerCase(), // Ensure it's lowercase to match schema
                description: "Experienced Teacher with required qualification are requested to apply",
                // Use the salary from parent application, default to "Negotiable" if not provided
                salary: record.salary || 'Negotiable',
                status: 'open',
                parentId: record._id // Make sure this is included explicitly
            };

            console.log("Creating vacancy with parentId:", record._id);
            
            // Create the vacancy first
            const createResponse = await apiService.createVacancy(vacancyData);
            const newVacancyId = createResponse.data._id;
            
            console.log('Vacancy created with ID:', newVacancyId);

            // Then update the parent with the vacancy reference and change status to pending
            const updateResponse = await fetch(`https://api.dearsirhometuition.com/api/parents/${record._id}/link-vacancy`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    vacancyId: newVacancyId,
                    status: 'pending'
                })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
                message.success('Parent application linked to vacancy');
            } else {
                message.warning('Created vacancy but failed to update parent status');
            }

            message.success('Vacancy created successfully');
            // Refresh the parent list to show updated status
            fetchParents();
            
        } catch (error) {
            console.error('Error:', error);
            message.error('Failed to create vacancy');
        }
    };


    const getStatusTag = (status, rejectedCount) => {
        const statusColors = {
            new: 'default',
            pending: 'processing',
            done: 'success',
            not_done: 'error'
        };

        const statusTexts = {
            new: 'New Application',
            pending: 'Vacancy Created',
            done: 'Teacher Assigned',
            not_done: `Failed (${rejectedCount} rejections)`
        };

        return (
            <Tag color={statusColors[status]}>
                {statusTexts[status]}
            </Tag>
        );
    };

    useEffect(() => {
        const ws = new WebSocket('wss://api.dearsirhometuition.com');

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'VACANCY_UPDATE' || data.type === 'PARENT_STATUS_UPDATED') {
                console.log('Received WebSocket notification:', data);
                // Refresh parent list when vacancy status or parent status changes
                fetchParents();
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    // Define different action columns for active vs trash view
    const getActionColumn = () => {
        if (showTrash) {
            return {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                    <Space>
                        <Tooltip title="Restore">
                            <Button
                                type="primary"
                                icon={<UndoOutlined />}
                                onClick={() => handleRestore(record._id)}
                            />
                        </Tooltip>
                        <Popconfirm
                            title="Delete permanently?"
                            description="This action cannot be undone!"
                            onConfirm={() => handlePermanentDelete(record._id)}
                            okText="Yes, Delete"
                            cancelText="No, Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                )
            };
        }
        
        // Regular view actions
        return {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button 
                            icon={<EyeOutlined />} 
                            onClick={() => {
                                setSelectedParent(record);
                                setViewModalVisible(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Create Vacancy">
                        <Button 
                            type="primary"
                            icon={<PlusCircleOutlined />} 
                            onClick={() => handleCreateVacancy(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Move to Trash">
                        <Button 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => showDeleteConfirm(record)}
                        />
                    </Tooltip>
                </Space>
            )
        };
    };

    // Base columns for both views
    const baseColumns = [
        {
            title: 'Application No.',
            dataIndex: 'applicationNumber',
            key: 'applicationNumber',
            width: 80,
            render: (applicationNumber) => (
                <span style={{ paddingLeft: '8px' }}>
                    {applicationNumber ? String(applicationNumber).padStart(2, '0') : 'N/A'}
                </span>
            ),
            fixed: 'left',
            sorter: (a, b) => (a.applicationNumber || 0) - (b.applicationNumber || 0)
        },
        {
          title: 'Parent Name',
          dataIndex: 'parentName',
          key: 'parentName',
          sorter: (a, b) => a.parentName.localeCompare(b.parentName)
        },
        {
          title: 'Phone',  
          dataIndex: 'phone',
          key: 'phone',
          render: (phone) => (
              <a href={`tel:${phone}`}>{phone}</a>
          )
        },
        {
            title: 'Preferred Teacher',
            dataIndex: 'preferredTeacher',
            key: 'preferredTeacher',
            render: (teacher) => (
                <Tag color={teacher === 'any' ? 'default' : teacher === 'male' ? 'blue' : 'pink'}>
                    {teacher.charAt(0).toUpperCase() + teacher.slice(1)}
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status, record) => getStatusTag(status, record.vacancyDetails?.rejectedCount || 0),
            filters: [
                { text: 'New Application', value: 'new' },
                { text: 'Vacancy Created', value: 'pending' },
                { text: 'Teacher Assigned', value: 'done' }
            ],
            onFilter: (value, record) => record.status === value,
            defaultFilteredValue: ['new']
        },
        {
          title: 'Grade',
          dataIndex: 'grade',
          key: 'grade',
          render: (grade) => `Grade ${grade}`
        },
        {
            title: 'Subjects',
            dataIndex: 'subjects',
            key: 'subjects',
            render: (subjects) => {
                // Add null check for subjects
                if (!subjects || !Array.isArray(subjects)) {
                    return '-';  // or return any default value you prefer
                }
                return (
                    <span>
                        {subjects.map((subject, index) => (
                            <span key={index}>
                                {subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ')}
                                {index < subjects.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                    </span>
                );
            }
        },
        {
            title: 'Location',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
            render: (address) => address || 'N/A'
        },
        {
            title: 'Salary',
            dataIndex: 'salary',
            key: 'salary',
            render: (salary) => salary || 'Not specified'
        }
    ];

    // Add action column to columns array
    const columns = [...baseColumns, getActionColumn()];

    return (
        <div className="parent-list">
            <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{showTrash ? 'Trash Bin' : 'Parent Applications'}</h2>
                <div>
                    <Switch 
                        checkedChildren="Trash" 
                        unCheckedChildren="Active" 
                        checked={showTrash}
                        onChange={(checked) => setShowTrash(checked)}
                        style={{ marginRight: '10px' }}
                    />
                </div>
            </div>
            
            <Table 
                columns={columns} 
                dataSource={parents}
                loading={loading}
                rowKey="_id"
                className="main-table"
                onChange={handleTableChange}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                    position: ['bottomRight']
                }}
                defaultSortOrder="descend"
                sortDirections={['descend', 'ascend']}
                locale={{ emptyText: showTrash ? 'Trash bin is empty' : 'No applications found' }}
            />

        <Modal
        title="Parent Details"
        visible={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        >
        {selectedParent && (
            <div>
            <p><strong>Parent Name:</strong> {selectedParent.parentName}</p>
            <p><strong>Phone:</strong> {selectedParent.phone}</p>
            <p><strong>Address:</strong> {selectedParent.address}</p>
            <p><strong>Salary:</strong> {selectedParent.salary || 'Not specified'}</p>
            <p><strong>Preferred Teacher:</strong> {
                selectedParent.preferredTeacher.charAt(0).toUpperCase() + 
                selectedParent.preferredTeacher.slice(1)
            }</p>
            <p><strong>Grade:</strong> Grade {selectedParent.grade}</p>
            <p><strong>Subjects:</strong> {
                selectedParent.subjects && Array.isArray(selectedParent.subjects) 
                    ? selectedParent.subjects.map((subject, index) => (
                        <span key={index}>
                            {subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ')}
                            {index < selectedParent.subjects.length - 1 ? ', ' : ''}
                        </span>
              ))
              : '-'}</p>
            <p><strong>Preferred Time:</strong> {
                {
                morning: 'Morning (6 AM - 10 AM)',
                afternoon: 'Afternoon (2 PM - 5 PM)',
                evening: 'Evening (5 PM - 8 PM)'
                }[selectedParent.preferredTime] || selectedParent.preferredTime
            }</p>
            <p><strong>Submission Date:</strong> {new Date(selectedParent.submissionDate).toLocaleString()}</p>
            </div>
        )}
        </Modal>
        </div>
    );
};

export default ParentList;
