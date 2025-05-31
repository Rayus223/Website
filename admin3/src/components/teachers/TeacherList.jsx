import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Table, Tag, Button, Space, Modal, message, Tooltip, Tabs, Card, 
    Form, Input, Select, Row, Col, Statistic, Checkbox, Switch, Badge, Upload, Spin, DatePicker, Drawer, InputNumber, Popover // <-- Add Upload, Spin, DatePicker, Drawer, InputNumber, Popover here
} from 'antd';
import { 
    EyeOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined,
    PlusOutlined, BookOutlined, UserOutlined, DeleteOutlined,
    EditOutlined, StarFilled, StarOutlined, WhatsAppOutlined, DollarOutlined, RollbackOutlined,
    CheckCircleOutlined, CopyOutlined // Add CheckCircleOutlined and CopyOutlined here
} from '@ant-design/icons';
import { DownloadOutlined } from '@ant-design/icons'; 
import apiService from '../../services/api';
import './styles.css';
import dayjs from 'dayjs';
import { ensureTeacherData, formatDate } from '../../utils/helpers';




const { TabPane } = Tabs;

const TeacherList = () => {
    // State declarations
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [vacancies, setVacancies] = useState([]);
    const [activeTab, setActiveTab] = useState('vacancies');
    const [modalState, setModalState] = useState({
        addVacancy: false,
        editVacancy: false,
        viewTeacher: false,
        selectedTeacher: null,
        selectedVacancy: null,
    });
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const [applicantsModalVisible, setApplicantsModalVisible] = useState(false);
    const [selectedVacancyApplicants, setSelectedVacancyApplicants] = useState([]);
    const [selectedVacancy, setSelectedVacancy] = useState(null);

    const [form] = Form.useForm();

    const [cvModalVisible, setCvModalVisible] = useState(false);
    const [selectedCvUrl, setSelectedCvUrl] = useState(null);

    const [searchText, setSearchText] = useState('');
    const [highlightedRow, setHighlightedRow] = useState(null);
    const tableRef = useRef(null);
    const [pageSize, setPageSize] = useState(1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [paymentConfirmationVisible, setPaymentConfirmationVisible] = useState(false);
    const [paymentAmountVisible, setPaymentAmountVisible] = useState(false);
    const [refundFormVisible, setRefundFormVisible] = useState(false);
    const [selectedRefundTeacher, setSelectedRefundTeacher] = useState(null);
    const [pendingAcceptData, setPendingAcceptData] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [budgetData, setBudgetData] = useState([]);
    const [budgetActiveTab, setBudgetActiveTab] = useState('all');
    const [refundForm] = Form.useForm();
    const [updatingId, setUpdatingId] = useState(null); // Add state for loading indicator

    // Add new state variables
    const [partialPaymentVisible, setPartialPaymentVisible] = useState(false);
    const [partialPaymentForm] = Form.useForm();

    // Add new state variables for parent details
    const [parentDetailsVisible, setParentDetailsVisible] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);

    // Add these state variables after the existing state declarations
    const [addApplicantModalVisible, setAddApplicantModalVisible] = useState(false);
    const [addApplicantForm] = Form.useForm();

    // Add this state variable after all the other state declarations, around line ~55
    const [followupTeachers, setFollowupTeachers] = useState({});

    // Add these state variables to the top of the component where other state variables are defined
    const [vacancyPage, setVacancyPage] = useState(1);
    const [vacancyPageSize, setVacancyPageSize] = useState(10);
    const [totalVacancies, setTotalVacancies] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Add useEffect to load followup data from localStorage on component mount
    useEffect(() => {
        try {
            const savedFollowups = localStorage.getItem('teacherFollowups');
            if (savedFollowups) {
                const followupData = JSON.parse(savedFollowups);
                
                // Filter out expired entries
                const currentTime = new Date().getTime();
                const validFollowups = Object.entries(followupData).reduce((acc, [teacherId, data]) => {
                    if (data.expiry > currentTime) {
                        acc[teacherId] = true;
                    }
                    return acc;
                }, {});
                
                setFollowupTeachers(validFollowups);
            }
        } catch (error) {
            console.error('Error loading followup data from localStorage:', error);
        }
    }, []);

    // Helper function to get combined status display for a teacher-vacancy pair
    const getCombinedStatusDisplay = (teacherId, vacancyId) => {
        if (!teacherId || !vacancyId || !budgetData || budgetData.length === 0) {
            return null;
        }

        // Find all transactions for this teacher and vacancy
        const relatedTransactions = budgetData.filter(entry => 
            doIdsMatch(String(entry.teacherId), String(teacherId)) &&
            doIdsMatch(String(entry.vacancyId), String(vacancyId))
        );
        
        // If there are no related transactions, return null
        if (relatedTransactions.length === 0) {
            return null;
        }
        
        // Count transactions by type and status
        const payments = relatedTransactions.filter(t => t.type === 'payment');
        const refunds = relatedTransactions.filter(t => t.type === 'refund');
        const partialPayments = payments.filter(p => p.status === 'partial');
        const fullPayments = payments.filter(p => p.status !== 'partial');
        
        // Create status tags array
        const statusTags = [];
        
        // Add tags for each type with counts
        if (partialPayments.length > 0) {
            statusTags.push(
                <Tag key="partial" color="orange">
                    Partial{partialPayments.length > 1 ? partialPayments.length : ''}
                </Tag>
            );
        }
        
        if (fullPayments.length > 0) {
            statusTags.push(
                <Tag key="paid" color="green">
                    P{fullPayments.length}
                </Tag>
            );
        }
        
        if (refunds.length > 0) {
            statusTags.push(
                <Tag key="refund" color="red">
                    R{refunds.length}
                </Tag>
            );
        }
        
        // If we have any tags, return them in a Space component
        if (statusTags.length > 0) {
            return <Space>{statusTags}</Space>;
        }
        
        return null;
    };

    // Define columns for the budget table
    

    // Modify handler function to open the Teacher Details modal
    const handleViewBudgetDetails = (record) => {
        // First check if we have the teacher data directly in the record
        if (record._teacherData) {
            handleViewTeacher(record._teacherData);
            return;
        }
        
        // Try to find the teacher by ID
        const teacherId = record.teacherId;
        if (!teacherId) {
            message.error('No teacher ID found in this record.');
            return;
        }
        
        // Look for the teacher in the teachers array
        const teacher = teachers.find(t => String(t._id) === String(teacherId));
        if (teacher) {
            handleViewTeacher(teacher);
        } else {
            // If we can't find the teacher, show a message with the teacher name at least
            const teacherName = record.teacherName || record.teacherFullName || 'Unknown';
            message.info(`Couldn't find complete details for teacher: ${teacherName}`);
        }
    };

    // Replace with new function
    const fetchBudgetData = async () => {
        try {
            setLoading(true);
            
            // Check for authentication token first
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('No authentication token found for budget data fetch');
                message.error('Authentication required. Please log in again.');
                    return;
            }

            try {
                // Fetch budget transactions
                const response = await apiService.getBudgetTransactions();
                
                // Extract the transactions array from the response
                let transactions = [];
                if (response && response.success && Array.isArray(response.data)) {
                    transactions = response.data;
                } else if (Array.isArray(response)) {
                    transactions = response;
                } else if (response && Array.isArray(response.data)) {
                    transactions = response.data;
                } else if (response && response.data && Array.isArray(response.data.data)) {
                    transactions = response.data.data;
                }
                
                // Debug print for first 5 entries to see the format
                console.log('Budget data sample (first 5 entries):');
                const sampleEntries = transactions.slice(0, 5);
                sampleEntries.forEach((entry, index) => {
                    console.log(`Entry ${index + 1}:`, {
                        type: entry.type,
                        teacherId: entry.teacherId ? String(entry.teacherId) : 'undefined',
                        teacherName: entry.teacherName,
                        vacancyId: entry.vacancyId ? String(entry.vacancyId) : 'undefined'
                    });
                });
                
                // Ensure each transaction has a unique ID
                const processedTransactions = transactions.map(transaction => {
                    // Ensure each transaction has an ID
                    const transactionWithId = {
                        ...transaction,
                        id: transaction._id || transaction.id || Math.random().toString()
                    };
                
                    // Clean any undefined or null values
                    Object.keys(transactionWithId).forEach(key => {
                        if (transactionWithId[key] === undefined || transactionWithId[key] === null) {
                            delete transactionWithId[key];
                        }
                    });
                    
                    return transactionWithId;
                });
                
                // Check if we have teachers data to enhance transactions
                if (teachers && teachers.length > 0) {
                    // Enhance transactions with teacher data
                    const enhancedTransactions = processedTransactions.map(transaction => {
                        // Try to find matching teacher
                        let matchedTeacher = null;
                        
                        // Try to match by ID
                        if (transaction.teacherId) {
                            matchedTeacher = teachers.find(t => String(t._id) === String(transaction.teacherId));
                        }
                        
                        // If not found by ID, try by name
                        if (!matchedTeacher && transaction.teacherName) {
                            matchedTeacher = teachers.find(t => 
                                t.fullName === transaction.teacherName || 
                                t.name === transaction.teacherName);
                        }
                        
                        // If teacher found, enhance the transaction
                        if (matchedTeacher) {
                            return {
                                ...transaction,
                                _teacherData: matchedTeacher,
                                teacherPhone: matchedTeacher.phone
                            };
                        }
                        
                        return transaction;
                    });
                    
                    // Update state with enhanced transactions
                    setBudgetData(enhancedTransactions);
                    
                    // Store in localStorage for backup
                    localStorage.setItem('budgetData', JSON.stringify(enhancedTransactions));
                } else {
                    // No teachers data available, use transactions as is
                    setBudgetData(processedTransactions);
                    
                    // Store in localStorage for backup
                    localStorage.setItem('budgetData', JSON.stringify(processedTransactions));
                }
                
                // Remove the success message
                // message.success(`Loaded ${processedTransactions.length} budget transactions`);
            } catch (apiError) {
                console.error('API error fetching budget transactions:', apiError);
                message.error('Failed to fetch budget transactions from API');
            
                // Try to load from localStorage as fallback
            const savedData = localStorage.getItem('budgetData');
            if (savedData) {
                    try {
                const parsedData = JSON.parse(savedData);
                setBudgetData(parsedData);
                        console.log('Loaded budget data from localStorage fallback');
                    } catch (parseError) {
                        console.error('Error parsing localStorage data:', parseError);
                        setBudgetData([]); // Set empty array if parsing fails
                    }
            } else {
                    setBudgetData([]); // Set empty array if no localStorage data
                }
            }
        } catch (error) {
            console.error('Error in fetchBudgetData:', error);
            message.error('Failed to load budget data');
            setBudgetData([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    // Update useEffect to fetch budget data on component mount
    useEffect(() => {
        fetchBudgetData();
    }, []);
  
    // useEffect(() => {
    //     fetchData(); // Initial fetch
        
    //     // Start polling every 10 seconds
    //     const interval = setInterval(() => {
    //         // Only fetch if we're on the vacancies tab
    //         if (activeTab === 'vacancies') {
    //       fetchData(false); // Pass false to indicate this is a background refresh
    //         }
    //     }, 10000);
    //     setPollingInterval(interval);
    
    // // Cleanup on unmount
    // return () => {
    //   if (pollingInterval) {
    //     clearInterval(pollingInterval);
    //   }
    // };
    // }, [activeTab]);

    // Refined useEffect for polling ONLY vacancies tab
    useEffect(() => {
        let intervalId = null;

        if (activeTab === 'vacancies') {
            fetchData(true); // Fetch immediately when tab becomes active
            intervalId = setInterval(() => {
                fetchData(false); // Poll without showing loading indicator
            }, 15000); // Poll every 15 seconds
        } else if (activeTab === 'budget') {
            // When switching to budget tab, ensure teachers and budget data are loaded
            const loadBudgetData = async () => {
                try {
                    setLoading(true);
                    // First load teachers if needed
                    if (!teachers || teachers.length === 0) {
                        const teachersResponse = await apiService.getAllTeachers();
                        setTeachers(teachersResponse || []);
                    }
                    
                    // Then load budget data
                    await fetchBudgetData();
                } catch (error) {
                    console.error('Error loading budget data:', error);
                    message.error('Failed to load budget data');
                } finally {
                    setLoading(false);
                }
            };
            
            loadBudgetData();
        }

        // Cleanup function: clear interval when tab changes or component unmounts
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [activeTab]); // Re-run this effect when activeTab changes

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const action = params.get('action');

    // Set active tab if specified
    if (tab === 'vacancies') {
        setActiveTab('vacancies');
    }

    // Check for pre-filled vacancy data
    const savedData = localStorage.getItem('newVacancyData');
    if (savedData && action === 'create') {
        const vacancyData = JSON.parse(savedData);
        form.setFieldsValue(vacancyData);
        setModalState(prev => ({
            ...prev,
            addVacancy: true
        }));
        localStorage.removeItem('newVacancyData');
    }
}, [form]);

const fetchData = async (showLoading = true, page = vacancyPage, loadMore = false) => {
    try {
        if (showLoading && !loadMore) {
            setLoading(true);
        }
        
        if (loadMore) {
            setLoadingMore(true);
        }

        // Get stored status updates from localStorage
        const statusUpdates = JSON.parse(localStorage.getItem('statusUpdates') || '{}');

        // Store current list of accepted teachers to preserve them
        const currentAcceptedTeachers = new Set();
        vacancies.forEach(vacancy => {
            vacancy.applications?.forEach(app => {
                if (app.status === 'accepted' && app.teacher) {
                    currentAcceptedTeachers.add(app.teacher._id);
                }
            });
        });

        // Only fetch data if we're on the vacancies tab
        if (activeTab === 'vacancies') {
            const [teachersResponse, vacanciesResponse] = await Promise.all([
                apiService.getAllTeachers(),
                apiService.getVacanciesPaginated(page, vacancyPageSize) // Update API call
            ]);

            // Process teachers with stored status
            const processedTeachers = teachersResponse.map(teacher => {
                const storedStatus = statusUpdates[teacher._id];
                return {
                    ...teacher,
                    isActive: storedStatus ? storedStatus.isActive : teacher.isActive,
                    status: storedStatus ? storedStatus.applicationStatus : teacher.status
                };
            });

            // Set teachers state, ensuring we don't lose any accepted teachers
            const teachersToSet = processedTeachers.map(teacher => {
                if (currentAcceptedTeachers.has(teacher._id)) {
                    return {
                        ...teacher,
                        status: 'accepted'
                    };
                }
                return teacher;
            });

            setTeachers(teachersToSet);
            
            // Update total count if available in response
            if (vacanciesResponse.total) {
                setTotalVacancies(vacanciesResponse.total);
                setHasMore(page * vacancyPageSize < vacanciesResponse.total);
            } else {
                // If no total in response, check if we got fewer items than requested
                setHasMore(vacanciesResponse.length === vacancyPageSize);
            }
            
            // If loading more, append to existing vacancies
            if (loadMore) {
                setVacancies(prev => [...prev, ...vacanciesResponse.data || vacanciesResponse]);
            } else {
                setVacancies(vacanciesResponse.data || vacanciesResponse);
            }
            
            // After teachers are loaded, fetch budget data with the updated teacher information
            await fetchBudgetData();
        } else if (activeTab === 'budget') {
            // If we're directly on the budget tab, make sure we have teachers first
            const teachersResponse = await apiService.getAllTeachers();
            
            // Process teachers with stored status as before
            const processedTeachers = teachersResponse.map(teacher => {
                const storedStatus = statusUpdates[teacher._id];
                return {
                    ...teacher,
                    isActive: storedStatus ? storedStatus.isActive : teacher.isActive,
                    status: storedStatus ? storedStatus.applicationStatus : teacher.status
                };
            });
            
            // Set teachers first so budget data can use it
            setTeachers(processedTeachers);
            
            // Then fetch budget data
            await fetchBudgetData();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch data');
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
};

    // Data fetching
    useEffect(() => {
        console.log('Component mounted, fetching data...');
        setVacancyPage(1); // Reset to page 1 on mount
        fetchData(true, 1, false);
    }, []);
    
    useEffect(() => {
        console.log('Vacancies state updated:', vacancies);
    }, [vacancies]);
   
    

 


       // Setup WebSocket connection
  // useEffect(() => {
  //     const websocket = new WebSocket('wss://api.dearsirhometuition.com');
      
  //     websocket.onopen = () => {
  //       console.log('WebSocket Connected');
  //       setWs(websocket);
  //     };
      
  //     websocket.onmessage = (event) => {
  //       const message = JSON.parse(event.data);
  //       handleWebSocketMessage(message);
  //     };
      
  //     websocket.onerror = (error) => {
  //       console.error('WebSocket error:', error);
  //     };
      
  //     websocket.onclose = () => {
  //       console.log('WebSocket disconnected');
  //       // Attempt to reconnect after 5 seconds
  //       setTimeout(() => {
  //         setWs(null);
  //       }, 5000);
  //     };
      
  //     return () => {
  //       if (websocket) {
  //         websocket.close();
  //       }
  //     };
  //   }, []);


  // Handle WebSocket messages
  // const handleWebSocketMessage = (message) => {
  //     switch (message.type) {
  //       case 'NEW_APPLICATION':
  //         // Update teachers and vacancies state
  //         setTeachers(prev => {
  //           const newTeachers = [...prev];
  //           const teacherIndex = newTeachers.findIndex(t => t._id === message.data.teacher._id);
  //           if (teacherIndex === -1) {
  //             newTeachers.push(message.data.teacher);
  //           }
  //           return newTeachers;
  //         });
        
  //         setVacancies(prev => {
  //           const newVacancies = [...prev];
  //           const vacancyIndex = newVacancies.findIndex(v => v._id === message.data.vacancy._id);
  //           if (vacancyIndex !== -1) {
  //             newVacancies[vacancyIndex] = {
  //               ...newVacancies[vacancyIndex],
  //               applications: [...newVacancies[vacancyIndex].applications, message.data]
  //             };
  //           }
  //           return newVacancies;
  //         });
  //         break;
        
  //       case 'STATUS_UPDATE':
  //         // Handle status updates
  //         updateApplicationStatusLocal(message.data);
  //         break;
        
  //       default:
  //         console.log('Unknown message type:', message.type);
  //     }
  //   };

  // Local state update function for websocket updates
  const updateApplicationStatusLocal = (data) => {
    setTeachers(prev => prev.map(teacher => 
      teacher._id === data.teacherId 
        ? { ...teacher, status: data.status }
        : teacher
    ));
    
    setVacancies(prev => prev.map(vacancy => ({
      ...vacancy,
      applications: vacancy.applications.map(app => 
        app.teacher._id === data.teacherId
          ? { ...app, status: data.status }
          : app
      )
    })));
  };




      
      // Update the status update handler
      const handleStatusUpdate = async (teacherId, status) => {
        try {
            setLoading(true);
            console.log('Starting status update for vacancy application:', { teacherId, status });

            // Update the vacancy application status
            const response = await apiService.updateVacancyApplicationStatus(teacherId, status);
            
            if (response.success) {
                message.success(`Vacancy application ${status} successfully`);
                
                // Update teachers state with the new application status
                setTeachers(prevTeachers => 
                    prevTeachers.map(teacher => 
                        teacher._id === teacherId 
                            ? { ...teacher, status: status }  // This updates the application status, not the teacher's general status
                            : teacher
                    )
                );
                
                // Update vacancies state
                setVacancies(prevVacancies => 
                    prevVacancies.map(vacancy => ({
                        ...vacancy,
                        applications: vacancy.applications?.map(app => 
                            app.teacher._id === teacherId
                                ? { ...app, status: status }
                                : app
                        )
                    }))
                );

                // Store the application status update in localStorage
                const updates = JSON.parse(localStorage.getItem('applicationStatusUpdates') || '{}');
                updates[teacherId] = status;
                localStorage.setItem('applicationStatusUpdates', JSON.stringify(updates));
                
            } else {
                throw new Error(response.message || 'Failed to update application status');
            }
        } catch (error) {
            console.error('Failed to update application status:', error);
            message.error(error.message || 'Failed to update application status');
        } finally {
            setLoading(false);
        }
    };
      
      // Update the view applicants handler
      const handleViewApplicants = async (vacancyId) => {
        let vacancy = null; // Define vacancy in the outer scope
        try {
            setLoading(true);
            
            // --- UPDATE LAST VIEWED TIMESTAMP --- 
            try {
                // Call the API to update the timestamp on the backend
                const response = await apiService.markApplicationsAsViewed(vacancyId);
                const newTimestamp = response?.data?.adminLastViewedApplicantsAt || new Date().toISOString(); // Use returned timestamp or now
                console.log(`Successfully updated timestamp for vacancy ${vacancyId} to ${newTimestamp}`);
                
                // Optimistically update local state with the new timestamp
                setVacancies(prevVacancies => prevVacancies.map(vac => {
                    if (vac._id === vacancyId) {
                        return {
                            ...vac,
                            adminLastViewedApplicantsAt: newTimestamp
                        };
                    }
                    return vac;
                }));
            } catch (markError) {
                console.error("Failed to update last viewed timestamp:", markError);
                // Don't block viewing applicants if marking fails, log it.
            }
            // --- END UPDATE TIMESTAMP ---
            
            // Find the vacancy in our local state (now potentially updated)
            // Assign to the outer scope variable
            vacancy = vacancies.find(v => v._id === vacancyId);
            
            if (!vacancy) {
                throw new Error('Vacancy not found in local state after potential update');
            }
            
            // Check if this vacancy already has an accepted application
            // Only count applications that are accepted and not refunded
            const hasAcceptedApplication = vacancy.applications?.some(app => {
                // Check if accepted
                if (app.status !== 'accepted') return false;
                
                // Check if not refunded
                const isRefunded = budgetData.some(entry => 
                    entry.type === 'refund' && 
                    (entry.teacherId === app.teacher?._id || entry.teacherId === app.teacherId) && 
                    entry.vacancyId === vacancyId
                );
                
                return !isRefunded;
            });
            
            console.log('Vacancy has accepted non-refunded application:', hasAcceptedApplication);
            
            // Format the applications data
            const applicants = vacancy.applications?.map(app => {
                // Check if this teacher has a refund
                const hasRefund = budgetData.some(entry => 
                    entry.type === 'refund' && 
                    (entry.teacherId === app.teacher?._id || entry.teacherId === app.teacherId) && 
                    entry.vacancyId === vacancyId
                );
                
                // If refunded, override status to "refunded"
                const status = hasRefund ? 'refunded' : (app.status || 'pending');
                
                // Get sample budget data for this teacher
                const teacherBudgetData = budgetData.filter(entry => 
                    (entry.teacherId === app.teacher?._id || entry.teacherId === app.teacherId) &&
                    entry.vacancyId === vacancyId
                );
                
                console.log(`DEBUG - Applicant ${app.teacher?.fullName || 'Unknown'}: ID=${app.teacher?._id}, Status=${status}, Has Refund=${hasRefund}, Budget Records=${teacherBudgetData.length}`);
                if (teacherBudgetData.length > 0) {
                    console.log('DEBUG - Sample budget data for this teacher:', teacherBudgetData[0]);
                }
                
                return {
                    ...app.teacher, 
                    _id: app._id, 
                    teacherId: app.teacher?._id,
                    status: status,
                    hasRefund: hasRefund,
                    appliedAt: app.appliedAt
                };
            }) || [];
            
            // Debug the overall set of applicants
            console.log('CRITICAL DEBUG - All applicants data structure:', JSON.stringify(applicants.map(a => ({
                id: a._id,
                teacherId: a.teacherId,
                status: a.status,
                hasRefund: a.hasRefund
            })), null, 2));
            
            console.log('CRITICAL DEBUG - Budget data length:', budgetData.length);
            console.log('CRITICAL DEBUG - Budget data sample:', budgetData.slice(0, 2));
            
            setSelectedVacancy({
                ...vacancy,
                hasAcceptedApplication
            });
            setSelectedVacancyApplicants(applicants);
            setApplicantsModalVisible(true);
        } catch (error) {
            console.error('Error preparing applicants:', error);
            // Use the vacancy object from the outer scope for error reporting if available
            message.error(`Failed to load applicants for ${vacancy?.title || 'vacancy'}: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

      const handleFeaturedToggle = async (vacancyId, featured) => {
        try {
          setLoading(true);
          await apiService.updateVacancy(vacancyId, { featured });
          
          // Update local state immediately
          setVacancies(prevVacancies => 
            prevVacancies.map(vacancy => 
              vacancy._id === vacancyId 
                ? { ...vacancy, featured } 
                : vacancy
            )
          );
          
          message.success(`Vacancy ${featured ? 'added to' : 'removed from'} featured list`);
          
          // Refresh data to ensure sync
          await fetchData(false); // Pass false to not show loading state again
        } catch (error) {
          console.error('Error updating featured status:', error);
          message.error('Failed to update featured status');
        } finally {
          setLoading(false);
        }
      };



    // Modal handlers
    const toggleModal = (modalType, data = null) => {
        setModalState(prev => ({
            ...prev,
            [modalType]: !prev[modalType],
            selectedTeacher: modalType === 'viewTeacher' ? data : prev.selectedTeacher,
            selectedVacancy: modalType === 'editVacancy' ? data : prev.selectedVacancy,
        }));

        // Reset form fields and set default values as needed
        if (!data) {
            form.resetFields();
            
            // If adding a new vacancy, generate automatic sequential title
            if (modalType === 'addVacancy') {
                // Generate a sequential title based on existing vacancies
                const generateSequentialTitle = async () => {
                    try {
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
                        
                        // Set the title in the form
                        form.setFieldsValue({ title: newTitle });
                    } catch (error) {
                        console.error('Error generating sequential title:', error);
                        // If there's an error, don't set anything and let user enter manually
                    }
                };
                
                generateSequentialTitle();
            }
        }
    };

    // Vacancy handlers
    const handleVacancySubmit = async (values) => {
        try {
            const vacancyData = {
                ...values,
                featured: values.featured || false,
                class: values.class || '',
                time: values.time || '',
                location: values.location || '',
                gender: values.gender || 'any',
                description: values.description || 'Experienced Teacher with required qualification are requested to apply'
            };

            if (modalState.selectedVacancy) {
                await apiService.updateVacancy(modalState.selectedVacancy._id, vacancyData);
                message.success('Vacancy updated successfully');
            } else {
                await apiService.createVacancy(vacancyData);
                message.success('Vacancy added successfully');
            }
            
            toggleModal(modalState.selectedVacancy ? 'editVacancy' : 'addVacancy');
            console.log('About to fetch data after vacancy submission');
            await fetchData(); // Make sure this is being called
            console.log('Finished fetching data after vacancy submission');
        } catch (error) {
            console.error('Vacancy operation failed:', error);
            message.error('Operation failed: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteVacancy = async (id) => {
        try {
            await apiService.deleteVacancy(id);
            message.success('Vacancy deleted successfully');
            fetchData();
        } catch (error) {
            message.error('Failed to delete vacancy');
        }
    };



    const handleViewTeacher = (teacher) => {
        setSelectedTeacher(teacher);
        setViewModalVisible(true);
    };

    // Helper function
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'orange';
            case 'approved':
            case 'accepted':
                return 'green';
            case 'rejected':
                return 'red';
            case 'refunded':
                return 'volcano';
            default:
                return 'gray';
        }
    };

 
    

    const getFileType = (url) => {
        if (url.endsWith('.pdf')) return 'pdf';
        if (url.endsWith('.doc') || url.endsWith('.docx')) return 'doc';
        if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image';
        if (url.endsWith('.png')) return 'image';
        // For Cloudinary URLs that might not have file extensions
        if (url.includes('cloudinary.com')) {
          if (url.includes('/image/upload/')) return 'image';
        }
        return 'unknown';
    };
    
    // Update handleViewCV function
    const handleViewCV = (cvUrl) => {
        if (cvUrl) {
          const fileType = getFileType(cvUrl);
          if (fileType === 'pdf') {
            // For PDF files, we'll directly set the URL in the iframe
            // If the URL has query parameters, add dl=0, otherwise add ?dl=0
            // This forces display instead of download
            let previewUrl = cvUrl;
            
            // Check if we need to modify the URL for Cloudinary
            if (cvUrl.includes('cloudinary.com')) {
              // Convert URL to ensure it's a direct PDF URL that can be embedded
              // Remove any potential transformation parameters that might cause issues
              if (cvUrl.includes('/upload/')) {
                // For regular URLs, ensure proper format for viewing
                previewUrl = cvUrl.includes('?') ? `${cvUrl}&dl=0` : `${cvUrl}?dl=0`;
              }
            }
            
            setSelectedCvUrl(previewUrl);
            setCvModalVisible(true);
          } else if (fileType === 'doc') {
            const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(cvUrl)}&embedded=true`;
            setSelectedCvUrl(googleDocsUrl);
            setCvModalVisible(true);
          } else if (fileType === 'image') {
            // For image files, directly set the URL and display the image
            setSelectedCvUrl(cvUrl);
            setCvModalVisible(true);
          } else {
            message.warning('File type not supported for preview. Downloading instead...');
            handleDownloadCV(cvUrl);
          }
        } else {
          message.error('CV not available');
        }
      };

    const handleDownloadCV = (cvUrl) => {
        if (cvUrl) {
            window.open(cvUrl, '_blank');
        } else {
            message.error('CV not available');
        }
    };

     const handleSearch = (value) => {
    setSearchText(value);
    
    if (value) {
      // Find all matching vacancies
      const matchedVacancyIndex = vacancies.findIndex(vacancy => 
        vacancy.title?.toLowerCase().includes(value.toLowerCase()) ||
        vacancy.subject?.toLowerCase().includes(value.toLowerCase()) ||
        vacancy.salary?.toString().includes(value)
      );

      if (matchedVacancyIndex !== -1) {
        setHighlightedRow(matchedVacancyIndex);
        
        // Calculate the page number based on the current pagination
        const pageSize = 1000; // Updated to 1000 items per page
        const pageNumber = Math.floor(matchedVacancyIndex / pageSize) + 1;
        
        // Scroll to the matched row
        setTimeout(() => {
          const rowElement = document.querySelector(`tr[data-row-key="${vacancies[matchedVacancyIndex]._id}"]`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        setHighlightedRow(null);
      }
    } else {
      setHighlightedRow(null);
    }
  };


  const handleTableChange = (pagination, filters, sorter) => {
    console.log('Pagination:', pagination); // For debugging
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleVacancyStatusToggle = async (vacancyId, currentStatus) => {
    try {
        setLoading(true);
        
        // Ensure status is correct format
        const newStatus = currentStatus?.toLowerCase() === 'open' ? 'closed' : 'open';
        console.log('Attempting status update:', { vacancyId, currentStatus, newStatus });

        const response = await apiService.updateVacancyStatus(vacancyId, newStatus);
        
        if (response.success) {
            message.success(`Vacancy status updated to ${newStatus}`);
            
            // Update local state
            setVacancies(prev => 
                prev.map(v => 
                    v._id === vacancyId 
                        ? { ...v, status: newStatus }
                        : v
                )
            );
        }
    } catch (error) {
        console.error('Failed to update vacancy status:', error);
        message.error('Failed to update vacancy status');
    } finally {
        setLoading(false);
    }
};


const handleApplicationStatus = async (applicationId, status) => {
    try {
        // --- DEBUG LOGGING START ---
        console.log(`[handleApplicationStatus] Called with applicationId: ${applicationId}, status: ${status}`);
        // --- DEBUG LOGGING END ---

        console.log(`Updating application ${applicationId} to ${status}`);
        
        // Find the complete application data including teacher info
        let teacherId = null;
        let teacherName = null;
        let vacancyId = null;
        let vacancyTitle = null;

        // --- REVISED: Declare variables before the loop --- 
        let foundVacancy = null;
        let foundApplication = null;
        
        // Find the application in vacancies state
        for (const currentVacancy of vacancies) {
            if (!currentVacancy.applications) continue;
            
            const app = currentVacancy.applications.find(a => a._id === applicationId); 
            if (app) {
                // Assign to outer variables
                foundVacancy = currentVacancy;
                foundApplication = app;

                // --- Moved checks inside the loop where application is valid ---
                if (!foundApplication.teacher) {
                    console.error('Error: Found application but application.teacher is null or undefined.', foundApplication);
                    message.error('Could not find teacher details for this application.');
                    return; // Stop processing if teacher details are missing
                }
                teacherId = foundApplication.teacher._id; 
                teacherName = foundApplication.teacher.fullName;
                vacancyId = foundVacancy._id;
                vacancyTitle = foundVacancy.title;
                // --- End moved checks ---
                break; // Exit loop once found
            }
        }

        // --- DEBUG LOGGING START (Now uses variables from outer scope) ---
        console.log('[handleApplicationStatus] Found vacancy:', foundVacancy);
        console.log('[handleApplicationStatus] Found application:', foundApplication);
        // --- DEBUG LOGGING END ---

        // Check if application was found before proceeding
        if (!foundApplication) {
             console.warn(`[handleApplicationStatus] Could not find application with ID: ${applicationId} in vacancies state.`);
             // Optionally try localStorage or show error
             // For now, just stop if not found in primary state
             message.error('Application details not found.');
             return; 
        }

        // If we didn't find the application in vacancies, try checking localStorage
        if (!teacherId) {
            // Try to get from localStorage instead of relying on undefined applications array
            const storedApplications = JSON.parse(localStorage.getItem('applications') || '[]');
            const application = storedApplications.find(app => app._id === applicationId);
            
            if (application && application.teacher) {
                teacherId = application.teacher._id;
                teacherName = application.teacher.fullName;
                // Try to find the vacancy
                for (const vacancy of vacancies) {
                    if (vacancy.applications && vacancy.applications.some(app => app._id === applicationId)) {
                        vacancyId = vacancy._id;
                        vacancyTitle = vacancy.title;
                        break;
                    }
                }
            }
        }

        if (!teacherId || !vacancyId) {
            console.warn(`Could not find complete application details for ID: ${applicationId}`);
        }

        // Set pendingAcceptData with all the info we have
        setPendingAcceptData({ 
            applicationId, 
            status,
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle 
        });

        console.log('Set pendingAcceptData:', { 
            applicationId, 
            status,
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle 
        });

        if (status === 'accepted') {
            setPaymentConfirmationVisible(true);
        } else {
            try {
                // --- DEBUG LOGGING START ---
                console.log(`[handleApplicationStatus] Calling API to update status for applicationId: ${applicationId}`);
                // --- DEBUG LOGGING END ---
                const response = await apiService.updateApplicationStatus(applicationId, status);
                if (response && response.success) {
                    message.success(`Application ${status} successfully`);
                    
                    // Update local state
                    setVacancies(prevVacancies => {
                        return prevVacancies.map(vacancy => {
                            if (vacancy.applications) {
                                const updatedApplications = vacancy.applications.map(app => {
                                    if (app._id === applicationId) {
                                        return { 
                                            ...app, 
                                            status,
                                            // If accepting, set isActive to true 
                                            isActive: status === 'accepted' ? true : app.isActive
                                        };
                                    }
                                    return app;
                                });
                                return { ...vacancy, applications: updatedApplications };
                            }
                            return vacancy;
                        });
                    });
                    
                    // If the status is 'accepted', also set the teacher as active
                    if (status === 'accepted' && teacherId) {
                        try {
                            await apiService.updateTeacherActiveStatus(teacherId, true);
                            
                            // Update teachers state
                            setTeachers(prev => 
                                prev.map(teacher => 
                                    teacher._id === teacherId 
                                        ? { ...teacher, isActive: true }
                                        : teacher
                                )
                            );
                            
                            console.log(`Teacher ${teacherId} set to active because application was accepted`);
                        } catch (activeError) {
                            console.error('Failed to set teacher as active:', activeError);
                            // Don't throw error here as the main acceptance was successful
                        }
                    }
                    
                    // Store the status update in localStorage
                    const updates = JSON.parse(localStorage.getItem('statusUpdates') || '[]');
                    updates.push({ applicationId, status, timestamp: new Date().toISOString() });
                    localStorage.setItem('statusUpdates', JSON.stringify(updates));
                }
            } catch (error) {
                console.error('Error updating application status:', error);
                message.error('Failed to update application status');
            }
        }
    } catch (error) {
        console.error('Error in handleApplicationStatus:', error);
        message.error('Failed to process application status change');
    }
};

// Update handlePaymentSubmission function
const handlePaymentSubmission = async (teacherId, vacancyId, applicationId, paymentData) => {
    try {
        setLoading(true);
        
        // Find teacher and vacancy details
        const vacancy = vacancies.find(v => v._id === vacancyId);
        const application = vacancy?.applications?.find(app => app._id === applicationId);
        const teacher = application?.teacher;

        if (!vacancy || !application || !teacher) {
            throw new Error('Could not find application details');
        }

        const payload = {
            teacherId: teacher._id,
            teacherName: teacher.fullName,
            vacancyId: vacancy._id,
            vacancyTitle: vacancy.title,
            applicationId: application._id,
            ...paymentData,
            date: new Date().toISOString(),
            status: paymentData.isPartial ? 'partial' : 'paid'  // Explicitly set status
        };

        console.log('Submitting payment with payload:', payload);
        const response = await apiService.processPayment(payload);
        
        if (response.success) {
            // Update local state with correct status
            setVacancies(prev => 
                prev.map(v => 
                    v._id === vacancyId 
                        ? {
                            ...v,
                            applications: v.applications.map(app =>
                                app._id === applicationId
                                    ? { 
                                        ...app, 
                                        status: 'accepted',
                                        paymentStatus: paymentData.isPartial ? 'partial' : 'paid',
                                        amountPaid: paymentData.amount,
                                        amountLeft: paymentData.amountLeft || 0,
                                        dueDate: paymentData.dueDate
                                    }
                                    : app
                            )
                        }
                        : v
                )
            );

            // Refresh budget data to get updated status
            await fetchBudgetData();
            
            message.success(paymentData.isPartial ? 'Partial payment recorded' : 'Full payment recorded');
            return true;
        } else {
            throw new Error('Failed to process payment');
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        message.error(error.message || 'Failed to process payment');
        return false;
    } finally {
        setLoading(false);
    }
};

// Update handlePaymentAmountSubmit
const handlePaymentAmountSubmit = async () => {
    try {
        // Validate payment amount
        if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
            message.error('Please enter a valid payment amount');
            return;
        }

        // Log the data we're starting with
        console.log('Starting full payment with pendingAcceptData:', pendingAcceptData);
        
        // Use our imported utility function to validate and complete teacher data
        const validatedData = ensureTeacherData(pendingAcceptData, vacancies);
        
        const { applicationId, teacherId, teacherName, vacancyId, vacancyTitle } = validatedData;
        
        console.log('Processing full payment for:', {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId
        });

        // Create a budget entry for the payment
        const budgetEntry = {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId,
            amount: parseFloat(paymentAmount),
            type: 'payment',
            status: 'paid',
            date: new Date().toISOString()
        };

        console.log('Creating budget entry:', budgetEntry);

        // Save the budget entry
        const budgetResponse = await apiService.createBudgetTransaction(budgetEntry);

        if (!budgetResponse || !budgetResponse.success) {
            throw new Error(budgetResponse?.message || 'Failed to create budget entry');
        }

        // Update application status
        const statusResponse = await updateApplicationStatus(applicationId, 'accepted', vacancyId);

        if (!statusResponse || !statusResponse.success) {
            throw new Error(statusResponse?.message || 'Failed to update application status');
        }

        // Update local state
        const updatedVacancies = [...vacancies];
        for (const vacancy of updatedVacancies) {
            if (vacancy._id === vacancyId && vacancy.applications) {
                for (const app of vacancy.applications) {
                    if (app._id === applicationId) {
                        app.status = 'accepted';
                        break;
                    }
                }
                break;
            }
        }
        setVacancies(updatedVacancies);

        // Fetch updated budget data
        const transactions = await apiService.getBudgetTransactions();
        if (transactions.success) {
            setBudgetData(transactions.data);
            localStorage.setItem('budgetData', JSON.stringify(transactions.data));
        }

        // Clear UI state
        setPaymentAmount('');
        setPaymentAmountVisible(false);
        setPendingAcceptData(null);
        
        message.success('Payment processed successfully');
    } catch (error) {
        console.error('Error processing payment:', error);
        message.error(error.message || 'Failed to process payment');
    }
};

// Utility function to ensure we have complete teacher data

// Utility function ensureTeacherData is now imported from utils/helpers.js

const handlePartialPaymentSubmit = async () => {
    try {
        const formValues = partialPaymentForm.getFieldsValue(); // Add this line back

        console.log('Form values:', formValues);
        
        const amountPaid = parseFloat(formValues.amountPaid);
        const amountLeft = parseFloat(formValues.amountLeft);
        const dueDate = formValues.dueDate ? new Date(formValues.dueDate) : null;
        
        if (isNaN(amountPaid) || amountPaid <= 0 || isNaN(amountLeft) || amountLeft <= 0 || !dueDate) {
            message.error('Please fill all fields with valid values');
            return;
        }

        // Log the data we're starting with
        console.log('Starting partial payment with pendingAcceptData:', pendingAcceptData);
        
        // Use our imported utility function to validate and complete teacher data
        const validatedData = ensureTeacherData(pendingAcceptData, vacancies);
        
        const { applicationId, teacherId, teacherName, vacancyId, vacancyTitle } = validatedData;
        
        console.log('Processing partial payment for:', {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId
        });

        // Store the partial payment details in localStorage for UI tracking
        // Note: The backend does not support these fields directly, so we use localStorage for UI purposes
        const partialPaymentData = {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            amountPaid,
            amountLeft,
            dueDate: dueDate.toISOString(),
            applicationId,
            date: new Date().toISOString()
        };
        
        // Update or create partial payments array in localStorage
        const existingPartialPayments = JSON.parse(localStorage.getItem('partialPayments') || '[]');
        existingPartialPayments.push(partialPaymentData);
        localStorage.setItem('partialPayments', JSON.stringify(existingPartialPayments));
        
        // Send transaction data to the backend
        // Only send fields that the backend API supports
        const transactionResponse = await apiService.createBudgetTransaction({
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId,
            amount: amountPaid,
            type: 'payment',
            status: 'partial',
            remainingAmount: amountLeft, // backend expects remainingAmount instead of amountLeft
            dueDate: dueDate.toISOString(),
            date: new Date().toISOString()
        });

        if (!transactionResponse || !transactionResponse.success) {
            throw new Error(transactionResponse?.message || 'Failed to create transaction');
        }

        // Update application status using our local function
        const statusResponse = await updateApplicationStatus(
            applicationId, 
            'accepted',
            vacancyId
        );
        
        if (!statusResponse || !statusResponse.success) {
            throw new Error(statusResponse?.message || 'Failed to update application status');
        }

        // Fetch updated budget data
        const transactions = await apiService.getBudgetTransactions();
        if (transactions.success) {
            setBudgetData(transactions.data);
            
            // Update the budget data in localStorage
            localStorage.setItem('budgetData', JSON.stringify(transactions.data));
        }

        partialPaymentForm.resetFields();
        setPartialPaymentVisible(false);
        message.success('Partial payment processed successfully');
    } catch (error) {
        console.error('Error processing partial payment:', error);
        message.error(error.message || 'Failed to process partial payment');
    }
};

// Update handlePaymentResponse
const handlePaymentResponse = (hasPaid) => {
    console.log('Payment response (hasPaid):', hasPaid);
    console.log('Current pendingAcceptData:', pendingAcceptData);
    
    try {
        // Validate and complete teacher data
        const validatedData = ensureTeacherData(pendingAcceptData, vacancies);
        
        // Update pendingAcceptData with complete information
        setPendingAcceptData(validatedData);
        
        console.log('Updated pendingAcceptData:', validatedData);

        // Close confirmation modal and open appropriate payment modal
        setPaymentConfirmationVisible(false);
        
        if (hasPaid) {
            setPaymentAmountVisible(true);
        } else {
            setPartialPaymentVisible(true);
        }
    } catch (error) {
        console.error('Error in handlePaymentResponse:', error);
        message.error(error.message || 'Could not process payment request');
        setPaymentConfirmationVisible(false);
    }
};

    // Helper function to get tag from application status
    const statusFromApplicationStatus = (status) => {
        const normalizedStatus = (status || 'pending').toLowerCase();
        
        switch (normalizedStatus) {
            case 'rejected':
                return <Tag color="red">Rejected</Tag>;
            case 'accepted':
                return <Tag color="green">Accepted</Tag>;
            case 'refunded':
                return <Tag color="volcano">Refunded</Tag>;
            case 'pending':
            default:
                return <Tag color="blue">Pending</Tag>;
        }
    };

    const teacherColumns = [
        {
            title: 'Applicant Name',
            dataIndex: 'fullName',
            key: 'fullName',
            sorter: (a, b) => a.fullName.localeCompare(b.fullName)
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email'
        },
        {
            title: 'Phone',
            key: 'phone',
            render: (phone) => {
                // Add robust check for applicant phone number
                if (typeof phone !== 'string' || !phone) {
                    return 'N/A';
                }
                // Now we know phone is a non-empty string
                const whatsappLink = `https://wa.me/${phone.replace(/\D/g, '')}`;  // Remove non-digits
                return (
                    <a 
                        href={whatsappLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            color: '#25D366',  // WhatsApp green color
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <WhatsAppOutlined />  {/* Add WhatsApp icon */}
                        {phone}
                    </a>
                );
            }
        },
        {
            title: 'Subjects',
            dataIndex: 'subjects',
            key: 'subjects',
            render: (subjects) => (
                <>
                    {subjects?.map(subject => (
                        <Tag key={subject} color="blue">
                            {subject}
                        </Tag>
                    )) || 'N/A'}
                </>
            )
        },
        {
            title: 'Application Status',
            key: 'applicationStatus',
            render: (_, record) => {
                // Get the application status from the vacancy applications
                const applicationStatus = record.status || 'pending';
                return (
                    <Tag color={getStatusColor(applicationStatus)}>
                        {applicationStatus.toUpperCase()}
                    </Tag>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                // Only show approve/reject actions if application is pending
                const applicationStatus = record.status?.toLowerCase();
                if (applicationStatus === 'approved' || applicationStatus === 'rejected') {
                    return (
                        <Space size="middle">
                            <Tooltip title="View Details">
                                <Button 
                                    icon={<EyeOutlined />} 
                                    onClick={() => handleViewTeacher(record)}
                                />
                            </Tooltip>
                            <Tooltip title="View CV">
                                <Button 
                                    icon={<FilePdfOutlined />}
                                    onClick={() => handleViewCV(record.cv)}
                                />
                            </Tooltip>
                            <Tag color={getStatusColor(applicationStatus)}>
                                {applicationStatus.toUpperCase()}
                            </Tag>
                        </Space>
                    );
                }

                return (
                    <Space size="middle">
                        <Tooltip title="View Details">
                            <Button 
                                icon={<EyeOutlined />} 
                                onClick={() => handleViewTeacher(record)}
                            />
                        </Tooltip>
                        <Tooltip title="View CV">
                            <Button 
                                icon={<FilePdfOutlined />}
                                onClick={() => handleViewCV(record.cv)}
                            />
                        </Tooltip>
                        <Tooltip title="Approve">
                            <Button 
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => {
                                    const teacherId = record?.teacher?._id || record?._id;
                                    if (!teacherId) {
                                        message.error('Invalid teacher data');
                                        return;
                                    }
                                    handleStatusUpdate(teacherId, 'approved');
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Reject">
                            <Button 
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    const teacherId = record?.teacher?._id || record?._id;
                                    if (!teacherId) {
                                        message.error('Invalid teacher data');
                                        return;
                                    }
                                    handleStatusUpdate(teacherId, 'rejected');
                                }}
                            />
                        </Tooltip>
                    </Space>
                );
            }
        }
    ];

    const vacancyColumns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (text, record, index) => {
                const isHighlighted = index === highlightedRow;
                
                // Get the creation time from the record
                const createdAt = record.createdAt || record.updatedAt || record.date;
                
                // Format relative time if we have a date
                let relativeTime = '';
                if (createdAt) {
                    const creationDate = dayjs(createdAt);
                    const today = dayjs().startOf('day');
                    const yesterday = today.subtract(1, 'day');
                    
                    if (creationDate.isAfter(today)) {
                        relativeTime = 'Today';
                    } else if (creationDate.isAfter(yesterday)) {
                        relativeTime = 'Yesterday';
                    } else {
                        // Calculate days difference
                        const diffDays = today.diff(creationDate, 'day');
                        if (diffDays < 7) {
                            relativeTime = `${diffDays} days ago`;
                        } else if (diffDays < 30) {
                            const diffWeeks = Math.floor(diffDays / 7);
                            relativeTime = `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
                        } else {
                            relativeTime = creationDate.format('MMM D, YYYY');
                        }
                    }
                }
                
                return (
                    <div>
                        <span style={{
                            backgroundColor: isHighlighted ? '#ffd54f' : 'transparent',
                            padding: isHighlighted ? '2px 4px' : '0',
                            borderRadius: '4px'
                        }}>
                            {text}
                        </span>
                        {relativeTime && (
                            <div style={{
                                fontSize: '12px',
                                color: '#8c8c8c',
                                marginTop: '2px'
                            }}>
                                {relativeTime}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location'
        },
        {
            title: 'Class',
            dataIndex: 'class',
            key: 'class',
            render: (classValue) => `Grade ${classValue}`
        },
        {
            title: 'Salary',
            dataIndex: 'salary',
            key: 'salary',
        },
        {
            title: 'Gender',
            dataIndex: 'gender',
            key: 'gender',
            render: (gender) => {
                const genderColors = {
                    'male': 'blue',
                    'female': 'pink',
                    'any': 'default'
                };
                
                // Format the display text
                const displayText = gender ? 
                    gender.charAt(0).toUpperCase() + gender.slice(1) : 
                    'Any';
                
                return (
                    <Tag color={genderColors[gender || 'any']}>
                        {displayText}
                    </Tag>
                );
            }
        },
        {
            title: 'Applications',
            dataIndex: 'applications',
            key: 'applications',
            render: (applications, record) => {
                const totalApplicationsCount = applications?.length || 0;
                
                // Determine the last time admin viewed this vacancy's applicants
                // Default to a very old date if never viewed
                const lastViewedTime = record.adminLastViewedApplicantsAt 
                                        ? new Date(record.adminLastViewedApplicantsAt) 
                                        : new Date(0); // Use epoch if null/undefined
                
                // Check if there are applications newer than the last viewed time
                const hasNewApplications = applications?.some(app => {
                    // Ensure appliedAt exists and is valid before comparing
                    return app.appliedAt && (new Date(app.appliedAt) > lastViewedTime);
                }) || false;

                // Tooltip shows count of new applications
                const newCount = applications?.filter(app => app.appliedAt && (new Date(app.appliedAt) > lastViewedTime)).length || 0;
                const badgeTitle = hasNewApplications 
                    ? `${newCount} new application(s) since last view` 
                    : (totalApplicationsCount > 0 ? 'No new applications' : 'No applications');

                return (
                    // Use hasNewApplications for the dot
                    <Badge dot={hasNewApplications} offset={[5, 0]} title={badgeTitle}>
                        <Button 
                            type="link" 
                            onClick={() => handleViewApplicants(record._id)}
                            disabled={totalApplicationsCount === 0}
                        >
                            {totalApplicationsCount} teacher{totalApplicationsCount !== 1 ? 's' : ''}
                        </Button>
                    </Badge>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <Tag 
                    color={status === 'open' ? 'green' : 'red'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleVacancyStatusToggle(record._id, status)}
                >
                    {status.toUpperCase()}
                </Tag>
            ),
            filters: [
                { text: 'Open', value: 'open' },
                { text: 'Closed', value: 'closed' }
            ],
            onFilter: (value, record) => record.status === value,
            filterMultiple: false
        },
        {
            title: 'Featured',
            dataIndex: 'featured',
            key: 'featured',
            width: 100,
            render: (_, record) => (
                <Switch
                    checked={record.featured}
                    onChange={(checked) => handleFeaturedToggle(record._id, checked)}
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Copy Vacancy">
                        <Button 
                            icon={<CopyOutlined />} 
                            onClick={() => handleCopyVacancy(record)}
                        />
                    </Tooltip>
                    {record.parentId && (
                        <Tooltip title="Copy Parent Details">
                            <Button 
                                icon={<UserOutlined />} 
                                onClick={() => handleCopyParentDetails(record)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="Edit">
                        <Button 
                            icon={<EditOutlined />} 
                            onClick={() => toggleModal('editVacancy', record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button 
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteVacancy(record._id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

// Update the applicantColumns definition
const applicantColumns = [
    {
        title: 'Name',
        dataIndex: 'fullName',
        key: 'fullName',
    },
    {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
    },
    {
        title: 'Phone',
        dataIndex: 'phone', // <<< ADD THIS LINE
        key: 'phone',
        render: (phone) => {
            // Add robust check for applicant phone number
            if (typeof phone !== 'string' || !phone) {
                return 'N/A';
            }
            // Now we know phone is a non-empty string
            const whatsappLink = `https://wa.me/${phone.replace(/\D/g, '')}`;  // Remove non-digits
            return (
                <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                        color: '#25D366',  // WhatsApp green color
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    <WhatsAppOutlined />
                    {phone}
                </a>
            );
        }
    },
    {
        title: 'Location',
        key: 'location',
        render: (record) => {
            const address = record.address;
            if (!address) return 'N/A';
            
            const parts = address.split(',');
            const shortAddress = parts.slice(0, 2)
                .map(part => part.trim())
                .join(', ');
            
            return shortAddress;
        }
    },
    
    {
        title: 'Status',
        key: 'paymentStatus',
        render: (_, record) => {
            try {
                // Get the teacher ID from the record
                const teacherId = record.teacherId || record._id;
                
                if (!teacherId) {
                    // Fall back to record status if we can't find teacher ID
                    return statusFromApplicationStatus(record.status);
                }
                
                // Find ALL transactions for this teacher across ALL vacancies
                const allTeacherTransactions = budgetData.filter(entry => 
                    String(entry.teacherId) === String(teacherId)
                );
                
                console.log(`DEBUG Status - Found ${allTeacherTransactions.length} total transactions for teacher: ${record.fullName}`);
                
                // If no matches found, try name-based matching as fallback
                let finalTransactions = allTeacherTransactions;
                if (allTeacherTransactions.length === 0 && record.fullName) {
                    console.log(`DEBUG Status - Trying name-based matching for ${record.fullName}`);
                    
                    // Look for entries with matching teacher name across all vacancies
                    const nameBasedMatches = budgetData.filter(entry => 
                        entry.teacherName && 
                        entry.teacherName.toLowerCase() === record.fullName.toLowerCase()
                    );
                    
                    console.log(`DEBUG Status - Found ${nameBasedMatches.length} name-based matches`);
                    
                    // Use name-based matches if found
                    if (nameBasedMatches.length > 0) {
                        finalTransactions = nameBasedMatches;
                    }
                }
                
                // If still no matches, fall back to application status
                if (finalTransactions.length === 0) {
                    console.log(`DEBUG Status - No transactions found, using status: ${record.status}`);
                    return statusFromApplicationStatus(record.status);
                }
                
                // Group by type
                const payments = finalTransactions.filter(entry => entry.type === 'payment');
                const refunds = finalTransactions.filter(entry => entry.type === 'refund');
                const partialPayments = payments.filter(p => p.status === 'partial');
                const fullPayments = payments.filter(p => p.status !== 'partial');
                
              
                // Create tags array
                const tags = [];
                
                // Add tags based on transaction types
                if (partialPayments.length > 0) {
                    tags.push(
                        <Tag key="partial" color="orange">
                            Partial{partialPayments.length > 1 ? partialPayments.length : ''}
                        </Tag>
                    );
                }
                
                if (fullPayments.length > 0) {
                    tags.push(
                        <Tag key="paid" color="green">
                            P{fullPayments.length}
                        </Tag>
                    );
                }
                
                if (refunds.length > 0) {
                    tags.push(
                        <Tag key="refund" color="red">
                            R{refunds.length}
                        </Tag>
                    );
                }
                
                // Also include current application status for this specific vacancy
                if (record.status && record.status !== 'pending') {
                    tags.push(statusFromApplicationStatus(record.status));
                }
                
                // If we have tags, return them
                if (tags.length > 0) {
                    console.log(`DEBUG Status - Returning ${tags.length} tags`);
                    return <Space>{tags}</Space>;
                }
                
                // If no tags were generated, fall back to application status
                console.log(`DEBUG Status - No tags generated, using status: ${record.status}`);
                return statusFromApplicationStatus(record.status);
            } catch (error) {
                console.error('Error in Status column render:', error);
                return <Tag color="default">Error</Tag>;
            }
        }
    },
   
    {
        title: 'Subjects',
        dataIndex: 'subjects',
        key: 'subjects',
        render: (subjects) => subjects?.join(', ') || 'N/A',
    },
    
  // In the applicantColumns, replace the Actions column with this:
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => {
        // Check if any teacher is already accepted for this vacancy that hasn't been refunded
        const vacancy = selectedVacancy;
        
        // Specifically check for applications that are:
        // 1. Marked as 'accepted' in the application status
        // 2. Do NOT have a corresponding refund entry in the budget
        const hasAcceptedApplication = vacancy?.applications?.some(app => {
            // First check if the application is accepted
            if (app.status !== 'accepted') return false;
            
            // Extract teacher IDs from the application for matching
            const teacherIdCandidates = [];
            if (app.teacher?._id) teacherIdCandidates.push(String(app.teacher._id));
            if (app.teacherId) teacherIdCandidates.push(String(app.teacherId));
            if (typeof app.teacher === 'string') teacherIdCandidates.push(String(app.teacher));
            
            // If no teacher IDs found, can't match a refund
            if (teacherIdCandidates.length === 0) return false;
            
            // Get the vacancy ID
            const vacancyIdStr = String(vacancy._id);
            
            // Then check if there's no refund for this teacher+vacancy
            const hasRefund = budgetData.some(entry => {
                // Skip non-refund entries
                if (entry.type !== 'refund') return false;
                
                // Skip entries without required IDs
                if (!entry.teacherId || !entry.vacancyId) return false;
                
                // Normalize entry IDs
                const entryTeacherIdStr = String(entry.teacherId);
                const entryVacancyIdStr = String(entry.vacancyId);
                
                // Check if any of our candidate IDs match the entry's teacherId
                const teacherIdMatch = teacherIdCandidates.some(id => 
                    doIdsMatch(id, entryTeacherIdStr)
                );
                
                // Check if vacancyId matches
                const vacancyIdMatch = doIdsMatch(vacancyIdStr, entryVacancyIdStr);
                
                return teacherIdMatch && vacancyIdMatch;
            });
            
            // Only count as "accepted" if there's no refund
            return !hasRefund;
        });
        
        console.log('Vacancy has accepted application:', hasAcceptedApplication);
        
        // Ensure we have a valid status - default to 'pending' if not set
        const recordStatus = (record.status || 'pending').toLowerCase();

        // Check if this teacher has a refund in the budget data
        const hasRefund = budgetData.some(entry => {
            // Skip non-refund entries
            if (entry.type !== 'refund') return false;
            
            // Extract all possible teacher IDs from the record
            const teacherIdCandidates = [];
            if (record.teacherId) teacherIdCandidates.push(String(record.teacherId));
            if (record._id) teacherIdCandidates.push(String(record._id));
            if (record.teacher?._id) teacherIdCandidates.push(String(record.teacher._id));
            if (record.id) teacherIdCandidates.push(String(record.id));
            
            // Skip if no teacher IDs
            if (teacherIdCandidates.length === 0) return false;
            
            // Get the vacancyId
            const vacancyIdStr = String(selectedVacancy._id);
            
            // Skip if no vacancy ID
            if (!vacancyIdStr) return false;
            
            // Normalize entry IDs
            const entryTeacherIdStr = String(entry.teacherId || '');
            const entryVacancyIdStr = String(entry.vacancyId || '');
            
            // Skip if entry is missing IDs
            if (!entryTeacherIdStr || !entryVacancyIdStr) return false;
            
            // Check if any of our candidate IDs match the entry's teacherId
            const teacherIdMatch = teacherIdCandidates.some(id => 
                doIdsMatch(id, entryTeacherIdStr)
            );
            
            // Check if vacancyId matches
            const vacancyIdMatch = doIdsMatch(vacancyIdStr, entryVacancyIdStr);
            
            // Debug logging for matches
            if (teacherIdMatch && vacancyIdMatch) {
                console.log('Found refund match:', {
                    teacherIds: teacherIdCandidates,
                    entryTeacherId: entryTeacherIdStr,
                    vacancyId: vacancyIdStr,
                    entryVacancyId: entryVacancyIdStr
                });
            }
            
            return teacherIdMatch && vacancyIdMatch;
        });
        
        // Get teacher ID for followup status checking
        const teacherId = record.teacherId || record._id || (record.teacher && record.teacher._id);
        const isFollowup = isTeacherFollowup(teacherId);
        
        // If already processed, show different options based on status
        if (recordStatus === 'accepted' || recordStatus === 'rejected' || hasRefund) {
            return (
                <Space size="middle">
                    <Tooltip title="View CV">
                        <Button 
                            icon={<FilePdfOutlined />}
                            onClick={() => handleViewCV(record.cv)}
                        />
                    </Tooltip>
                    
                    <Tooltip title={isFollowup ? "Remove from followup" : "Add to followup"}>
                        <Button 
                            icon={isFollowup ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                            onClick={() => toggleFollowupStatus(teacherId)}
                        />
                    </Tooltip>
                    
                    {hasRefund ? (
                        <Tag color="volcano">REFUNDED</Tag>
                    ) : (
                        <Tag color={recordStatus === 'accepted' ? 'green' : 'red'}>
                            {recordStatus.toUpperCase()}
                        </Tag>
                    )}
                    
                    {/* Show refund button only for accepted applications that haven't been refunded */}
                    {recordStatus === 'accepted' && !hasRefund && (
                        <Tooltip title="Process Refund">
                            <Button 
                                danger
                                icon={<RollbackOutlined />}
                                onClick={() => handleRefundClick(record, {
                                    _id: selectedVacancy._id,
                                    title: selectedVacancy.title
                                })}
                            />
                        </Tooltip>
                    )}
                </Space>
            );
        }

        // Only show accept/reject buttons for pending applications
        return (
            <Space size="middle">
                <Tooltip title="View CV">
                    <Button 
                        icon={<FilePdfOutlined />}
                        onClick={() => handleViewCV(record.cv)}
                    />
                </Tooltip>

                <Tooltip title={isFollowup ? "Remove from followup" : "Add to followup"}>
                    <Button 
                        icon={isFollowup ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                        onClick={() => toggleFollowupStatus(teacherId)}
                    />
                </Tooltip>

                <Tooltip title={hasAcceptedApplication ? "Another teacher is already accepted" : "Accept"}>
                    <Button 
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleApplicationStatus(record._id, 'accepted')}
                        disabled={hasAcceptedApplication}
                    />
                </Tooltip>
                <Tooltip title="Reject">
                    <Button 
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleApplicationStatus(record._id, 'rejected')}
                    />
                </Tooltip>
            </Space>
        );
    }
}
];

const budgetColumns = [
    {
        title: 'Teacher Name',
        key: 'teacherName',
        render: (_, record) => {
            // For expense records, show description instead of teacher name
            if (record.type === 'expense') {
                return <span style={{ fontStyle: 'italic' }}>{record.description || 'Expense'}</span>;
            }
            
            // Try multiple sources for teacher name
            const name = record.teacherFullName || record.teacherName || 
                (record._teacherData ? record._teacherData.fullName : null);
            
            // If a name is found, display it, otherwise show N/A
            if (name) {
                return name;
            }
            
            // If no name but we have teacherId, try to find the teacher in the teachers array
            if (record.teacherId) {
                const teacher = teachers.find(t => String(t._id) === String(record.teacherId));
                if (teacher) {
                    return teacher.fullName || teacher.name || 'Unknown';
                }
            }
            
            return 'N/A';
        },
        sorter: (a, b) => {
            // For expenses, sort by description
            if (a.type === 'expense' && b.type === 'expense') {
                return (a.description || '').localeCompare(b.description || '');
            }
            // For teacher records, sort by name
            const nameA = a.teacherFullName || a.teacherName || '';
            const nameB = b.teacherFullName || b.teacherName || '';
            return nameA.localeCompare(nameB);
        }
    },
    {
        title: 'Phone',
        key: 'phone',
        render: (_, record) => {
            // Don't show phone for expenses
            if (record.type === 'expense') {
                return '-';
            }
            
            // Try multiple sources for phone number
            let phoneNumber = null;
            let teacherData = null;
            
            // 1. First try to find the teacher by name in the teachers array
            if (record.teacherName) {
                teacherData = teachers.find(t => 
                    t.fullName === record.teacherName || 
                    t.name === record.teacherName);
                
                // If not found in the teachers array, try the manual mapping
                if (!teacherData || !teacherData.phone) {
                    phoneNumber = getTeacherPhoneByName(record.teacherName);
                }
            }
            
            // 2. If not found by name, try to find by ID
            if (!phoneNumber && !teacherData && record.teacherId) {
                teacherData = teachers.find(t => 
                    String(t._id) === String(record.teacherId));
            }
            
            // 3. Use phone from the found teacher data
            if (!phoneNumber && teacherData && teacherData.phone) {
                phoneNumber = teacherData.phone;
            }
            
            // 4. If still not found, check direct record properties
            if (!phoneNumber) {
                phoneNumber = record.phone || 
                             (record._teacherData && record._teacherData.phone) || 
                             record.teacherPhone;
            }
            
            // If no phone number found, show N/A
            if (!phoneNumber || phoneNumber === 'undefined') {
                return 'N/A';
            }
            
            // Now we know phone is a valid number
            const whatsappLink = `https://wa.me/${phoneNumber.replace(/\D/g, '')}`;  // Remove non-digits
            return (
                <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                        color: '#25D366',  // WhatsApp green color
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    <WhatsAppOutlined />
                    {phoneNumber}
                </a>
            );
        }
    },
    {
        title: 'Vacancy/Description',
        dataIndex: 'vacancyTitle',
        key: 'vacancyTitle',
        render: (text, record) => {
            // For expenses, show description
            if (record.type === 'expense') {
                return <span>{record.description || 'N/A'}</span>;
            }
            return text || 'N/A';
        }
    },
    
    {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount, record) => {
            // Ensure amount is treated as a number and has a fallback
            const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
            
            // For expenses, use a different color
            if (record.type === 'expense') {
                return <span style={{ color: '#ff4d4f' }}>Rs. {numAmount.toLocaleString()}</span>;
            }
            
            return `Rs. ${numAmount.toLocaleString()}`;
        }
    },
    {
        title: 'Status',
        key: 'status',
        render: (_, record) => {
            if (record.status === 'partial') { // Use record.status
                return (
                    <Tag color="orange">
                        Partial Payment
                    </Tag>
                );
            }
            // For non-partial, check type for paid/refunded
            if (record.type === 'payment') {
                return <Tag color="green">Paid</Tag>;
            }
            if (record.type === 'refund') {
                return <Tag color="red">Refunded</Tag>;
            }
            // Fallback for unknown status/type
            return <Tag>{record.status || record.type}</Tag>;
        },
        filters: [
            { text: 'Partial Payment', value: 'partial' },
            { text: 'Paid', value: 'paid' },
            { text: 'Refunded', value: 'refund' },
            { text: 'Expense', value: 'expense' }
        ],
        onFilter: (value, record) => {
            if (value === 'partial') {
                return record.status === 'partial';
            }
            if (value === 'paid') {
                return record.type === 'payment' && record.status !== 'partial';
            }
            if (value === 'refund') {
                return record.type === 'refund';
            }
            if (value === 'expense') {
                return record.type === 'expense';
            }
            return false;
        },
        filterMultiple: true,
        defaultFilteredValue: ['partial']
    },
    {
        title: 'Remaining',
        key: 'remaining',
        render: (_, record) => {
            if (record.type === 'expense') {
                return '-';
            }
            
            if (record.status === 'partial' && (record.remainingAmount || record.amountLeft)) { // Check both possible field names
                const amount = record.remainingAmount || record.amountLeft || 0;
                const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
                return `Rs. ${numAmount.toLocaleString()}`;
            }
            return '-';
        }
    },
    {
        title: 'Due Date',
        key: 'dueDate',
        render: (_, record) => {
            if (record.type === 'expense') {
                return '-';
            }
            
            if (record.status === 'partial' && record.dueDate) { // Use record.status
                return dayjs(record.dueDate).format('DD MMM YYYY');
            }
            return '-';
        }
    },
    {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        render: (date) => date ? dayjs(date).format('DD MMM YYYY') : 'N/A',
    },
    {
        title: 'Actions', 
        key: 'actions',
        render: (_, record) => {
            // For expenses, show delete button
            if (record.type === 'expense') {
                return (
                    <Space>
                        <Tooltip title="Delete Expense">
                            <Button 
                                danger
                                icon={<DeleteOutlined />} 
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Delete Expense',
                                        content: 'Are you sure you want to delete this expense?',
                                        okText: 'Yes, Delete',
                                        okType: 'danger',
                                        cancelText: 'No',
                                        onOk: async () => {
                                            try {
                                                await apiService.deleteBudgetTransaction(record._id);
                                                message.success('Expense deleted successfully');
                                                fetchBudgetData();
                                            } catch (error) {
                                                console.error('Failed to delete expense:', error);
                                                message.error('Failed to delete expense');
                                            }
                                        }
                                    });
                                }}
                            />
                        </Tooltip>
                    </Space>
                );
            }
            
            return (
                <Space>
                    <Tooltip title="View Teacher Details">
                        <Button 
                            icon={<EyeOutlined />} 
                            onClick={() => handleViewBudgetDetails(record)} 
                        />
                    </Tooltip>
                    {/* Conditionally render Mark as Paid button */}
                    {record.status === 'partial' && (
                        <Tooltip title="Mark as Paid">
                            <Button 
                                icon={<CheckCircleOutlined />} 
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Confirm Mark as Paid',
                                        content: 'Are you sure you want to mark this partial payment as fully paid? This action cannot be undone.',
                                        okText: 'Yes, Mark as Paid',
                                        okType: 'primary',
                                        cancelText: 'No, Cancel',
                                        onOk() {
                                            handleMarkAsPaid(record._id); // Call the original handler on confirmation
                                        }
                                    });
                                }}
                                loading={updatingId === record._id} // Show loading on the clicked button
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    }
];

    // Define columns for accepted teachers
    const acceptedTeacherColumns = [
        {
            title: 'Teacher Name',
            dataIndex: 'fullName',
            key: 'fullName',
            sorter: (a, b) => a.fullName.localeCompare(b.fullName)
        },
        
        {
            title: 'Phone',
            dataIndex: 'phone', // <<< ADD THIS LINE
            key: 'phone',
            render: (phone) => {
                // Add robust check for applicant phone number
                if (typeof phone !== 'string' || !phone) {
                    return 'N/A';
                }
                // Now we know phone is a non-empty string
                const whatsappLink = `https://wa.me/${phone.replace(/\D/g, '')}`;  // Remove non-digits
                return (
                    <a 
                        href={whatsappLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            color: '#25D366',  // WhatsApp green color
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <WhatsAppOutlined />
                        {phone}
                    </a>
                );
            }
        },
         
        {
            title: 'Vacancy',
            key: 'vacancy',
            render: (_, record) => (
                <div>
                    <Tag color="purple">{record.vacancyId}</Tag>
                    <br />
                    <small style={{ color: '#666' }}>{record.vacancyTitle}</small>
                </div>
            )
        },
        {
            title: 'Active Status',
            key: 'activeStatus',
            render: (_, record) => {
                if (record.refunded || record.applicationStatus === 'refunded') {
                    return <Tag color="volcano">REFUNDED</Tag>;
                }
                return (
                    <Tag color={record.isActive ? 'green' : 'orange'}>
                        {record.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="View Details">
                        <Button 
                            icon={<EyeOutlined />} 
                            onClick={() => handleViewTeacher(record)}
                        />
                    </Tooltip>
                    <Tooltip title="View CV">
                        <Button 
                            icon={<FilePdfOutlined />}
                            onClick={() => handleViewCV(record.cv)}
                        />
                    </Tooltip>
                    <Switch
                        checked={record.isActive}
                        onChange={(checked) => handleTeacherActiveStatus(record._id, checked)}
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        disabled={record.refunded || record.applicationStatus === 'refunded'} // Disable switch for refunded teachers
                    />
                    {/* Only show the refund button if the teacher hasn't been refunded yet */}
                    {(!record.refunded && record.applicationStatus !== 'refunded') && (
                        <Tooltip title="Process Refund">
                            <Button 
                                danger
                                icon={<RollbackOutlined />}
                                onClick={() => handleRefundClick(record, {
                                    _id: record.vacancyId,
                                    title: record.vacancyTitle
                                })}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    

    // Function to get accepted teachers - Use useMemo for optimization
    const acceptedTeachersData = useMemo(() => {
        const acceptedTeachersWithVacancies = [];
        const processedTeachers = new Set(); // To track which teachers we've already processed
        
        console.log('Recalculating accepted teachers list...'); // Add log
        
        // Iterate through each vacancy
        vacancies.forEach(vacancy => {
            // Find accepted applications in this vacancy (including those that might be refunded)
            vacancy.applications?.forEach(app => {
                // Include if application status is 'accepted' OR 'refunded'
                if ((app.status === 'accepted' || app.status === 'refunded') && app.teacher) {
                    const teacherVacancyKey = `${app.teacher._id}-${vacancy._id}`;
                    
                    // Skip if we've already processed this teacher for this vacancy
                    if (processedTeachers.has(teacherVacancyKey)) {
                        return;
                    }
                    
                    // Check if this teacher-vacancy combination has a refund in budgetData
                    const hasRefund = budgetData.some(entry => 
                        entry.type === 'refund' && 
                        (entry.teacherId === app.teacher._id || 
                         entry.teacherId === app.teacher._id.toString()) && 
                        (entry.vacancyId === vacancy._id || 
                         entry.vacancyId === vacancy._id.toString())
                    );
                    
                    // Find the full teacher data
                    const teacher = teachers.find(t => t._id === app.teacher._id);
                    if (teacher) {
                        // Create a new entry with both teacher and vacancy info
                        acceptedTeachersWithVacancies.push({
                            ...teacher,
                            uniqueKey: teacherVacancyKey,
                            vacancyId: vacancy._id,
                            vacancyTitle: vacancy.title,
                            // Set applicationStatus to 'refunded' if either the app status is refunded or there's a refund transaction
                            applicationStatus: app.status === 'refunded' || hasRefund ? 'refunded' : app.status,
                            // For refunded teachers, keep the active status they had before (or use teacher.isActive with fallback to false)
                            isActive: (app.status === 'refunded' || hasRefund) ? (teacher.isActive || false) : (app.isActive || true),
                            refunded: app.status === 'refunded' || hasRefund
                        });
                        
                        // Mark this teacher-vacancy combination as processed
                        processedTeachers.add(teacherVacancyKey);
                    }
                }
            });
        });

        console.log(`Finished calculating accepted teachers. Count: ${acceptedTeachersWithVacancies.length}`);
        return acceptedTeachersWithVacancies;
    }, [teachers, vacancies, budgetData]); // Add budgetData as dependency to update when refunds change

    // Add new function to handle teacher active status
    const handleTeacherActiveStatus = async (teacherId, isActive) => {
        try {
            setLoading(true);
            
            // For accepted teachers, prevent deactivation
            if (!isActive) {
                Modal.confirm({
                    title: 'Confirm Deactivation',
                    content: 'Are you sure you want to deactivate this teacher? This will mark them as inactive in the system.',
                    okText: 'Yes, Deactivate',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: async () => {
                        await updateTeacherActiveStatus(teacherId, false);
                    },
                    onCancel: () => {
                        // Revert UI switch back to checked
                        setTeachers(prev => 
                            prev.map(teacher => 
                                teacher._id === teacherId 
                                    ? { ...teacher, isActive: true }
                                    : teacher
                            )
                        );
                    }
                });
            } else {
                // If activating, just do it without confirmation
                await updateTeacherActiveStatus(teacherId, true);
            }
        } catch (error) {
            console.error('Failed to update teacher status:', error);
            message.error('Failed to update teacher status');
        } finally {
            setLoading(false);
        }
    };
    
    // Helper function to actually update the teacher status
    const updateTeacherActiveStatus = async (teacherId, isActive) => {
        try {
            // Update teacher's active status in localStorage first (optimistic update)
            const statusUpdates = JSON.parse(localStorage.getItem('statusUpdates') || '{}');
            statusUpdates[teacherId] = {
                ...statusUpdates[teacherId],
                isActive: isActive,
                // Ensure we preserve the application status
                applicationStatus: statusUpdates[teacherId]?.applicationStatus || 'accepted'
            };
            localStorage.setItem('statusUpdates', JSON.stringify(statusUpdates));
            
            // Update local state immediately - only change isActive, don't touch status
            setTeachers(prev => 
                prev.map(teacher => 
                    teacher._id === teacherId 
                        ? { ...teacher, isActive }
                        : teacher
                )
            );
            
            // Also update vacancies state if needed - only change isActive, don't touch status
            setVacancies(prev => 
                prev.map(vacancy => ({
                    ...vacancy,
                    applications: vacancy.applications?.map(app => 
                        app.teacher?._id === teacherId
                            ? { ...app, isActive }
                            : app
                    )
                }))
            );
            
            // Then send the API request
            await apiService.updateTeacherActiveStatus(teacherId, isActive);
            message.success(`Teacher ${isActive ? 'activated' : 'deactivated'} successfully`);
            
            // No need to fetch all data, we've already updated the state optimistically
            return true;
        } catch (error) {
            console.error('Failed to update teacher status:', error);
            message.error('Failed to update teacher status');
            
            // Revert the optimistic update on error
            const oldStatusUpdates = JSON.parse(localStorage.getItem('statusUpdates') || '{}');
            if (oldStatusUpdates[teacherId]) {
                const oldIsActive = !isActive;
                
                setTeachers(prev => 
                    prev.map(teacher => 
                        teacher._id === teacherId 
                            ? { ...teacher, isActive: oldIsActive }
                            : teacher
                    )
                );
                
                setVacancies(prev => 
                    prev.map(vacancy => ({
                        ...vacancy,
                        applications: vacancy.applications?.map(app => 
                            app.teacher?._id === teacherId
                                ? { ...app, isActive: oldIsActive }
                                : app
                        )
                    }))
                );
            }
            return false;
        }
    };

    // Add a helper function to standardize application data
    const standardizeApplicationData = (application, teacher, vacancyData) => {
        if (!application) return null;

        // Make a deep copy to avoid reference issues
        const standardizedApp = { ...application };
        const teacherId = teacher?._id || teacher?.id || teacher?.teacherId;
        const vacancyId = vacancyData?._id || vacancyData?.id || vacancyData?.vacancyId;

        // Ensure teacher object exists and has required properties
        if (!standardizedApp.teacher || typeof standardizedApp.teacher !== 'object') {
            standardizedApp.teacher = {
                _id: teacherId,
                fullName: teacher?.fullName || teacher?.name || 'Unknown Teacher',
                email: teacher?.email || 'unknown@email.com',
                phone: teacher?.phone || null
            };
        }

        // Ensure application has direct teacherId for easier lookups
        standardizedApp.teacherId = teacherId;
        standardizedApp.vacancyId = vacancyId;
        
        // Ensure application has a status (default to 'accepted' for refunds)
        standardizedApp.status = standardizedApp.status || 'accepted';

        return standardizedApp;
    };

    // Add refund handling functions with improved error handling
    const handleRefundClick = (teacher, vacancy) => {
        try {
            console.log('handleRefundClick called with:', { teacher, vacancy });
            
            // Extract IDs with fallbacks
            const teacherId = teacher?._id || teacher?.id || teacher?.teacherId;
            const vacancyId = vacancy?._id || vacancy?.id || vacancy?.vacancyId;
            
            console.log('Using teacher ID:', teacherId);
            console.log('Using vacancy ID:', vacancyId);
            
            if (!teacherId || !vacancyId) {
                message.error('Invalid teacher or vacancy ID');
                console.error('Invalid IDs:', { teacherId, vacancyId });
                return;
            }
            
            // Find the vacancy in our local state
            const foundVacancy = vacancies.find(v => v._id === vacancyId);
            
            // Debug logging
            console.log('Found vacancy:', foundVacancy ? foundVacancy._id : 'not found');
            console.log('Vacancy applications array exists:', !!foundVacancy?.applications);
            if (foundVacancy?.applications) {
                console.log('Applications count:', foundVacancy.applications.length);
            }
            
            // Try multiple approaches to find the application
            let foundApplication = null;
            
            // Approach 1: Direct match with primary IDs
            if (foundVacancy?.applications?.length > 0) {
                foundApplication = foundVacancy.applications.find(app => 
                    (app.teacher && app.teacher._id === teacherId) ||
                    (app.teacherId === teacherId)
                );
            }
            
            // Approach 2: Search for any applications with matching teacher info
            if (!foundApplication && foundVacancy?.applications?.length > 0) {
                foundApplication = foundVacancy.applications.find(app => {
                    // Check the teacher object for any property that might match
                    if (app.teacher) {
                        if (typeof app.teacher === 'object') {
                            return Object.values(app.teacher).includes(teacherId);
                        } else if (app.teacher.toString() === teacherId) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            
            // Approach 3: Check all vacancies if still not found
            if (!foundApplication) {
                console.log('Searching all vacancies for the application...');
                for (const v of vacancies) {
                    if (v._id !== vacancyId && v.applications?.length > 0) {
                        const app = v.applications.find(a => 
                            (a.teacher && a.teacher._id === teacherId) ||
                            (a.teacherId === teacherId)
                        );
                        if (app) {
                            console.log('Found application in a different vacancy:', v._id);
                            foundVacancy = v;
                            foundApplication = app;
                            break;
                        }
                    }
                }
            }
            
            // Approach 4: Create a synthetic application if all else fails
            if (!foundApplication) {
                console.log('No application found in any vacancy. Creating synthetic application.');
                
                // Confirm with the user before proceeding
                Modal.confirm({
                    title: 'Application Record Not Found',
                    content: 'We could not find the application record. Do you want to proceed with the refund anyway?',
                    okText: 'Proceed',
                    cancelText: 'Cancel',
                    onOk() {
                        // Create synthetic application with standardized structure
                        const syntheticApplication = standardizeApplicationData(
                            { _id: `synthetic-${Date.now()}`, status: 'accepted' },
                            teacher,
                            vacancy
                        );
                        
                        console.log('Created synthetic application:', syntheticApplication);
                        lookForPaymentRecords(syntheticApplication, teacher, vacancy);
                    }
                });
                return;
            }
            
            // Standardize the application data structure
            const standardizedApplication = standardizeApplicationData(
                foundApplication,
                teacher,
                foundVacancy || vacancy
            );
            
            console.log('Using standardized application:', standardizedApplication);
            lookForPaymentRecords(standardizedApplication, teacher, vacancy);
            
        } catch (error) {
            console.error('Error preparing refund:', error);
            message.error('Failed to prepare refund: ' + error.message);
        }
    };

    // Helper function to look for payment records with improved handling
    const lookForPaymentRecords = (application, teacher, vacancy) => {
        try {
            // Extract all possible IDs for robust matching
            const teacherIds = [
                application?.teacher?._id,
                application?.teacherId,
                teacher?._id,
                teacher?.id,
                teacher?.teacherId
            ].filter(Boolean);
            
            const applicationId = application?._id;
            const vacancyId = application?.vacancyId || vacancy?._id;
            
            if (teacherIds.length === 0 || !vacancyId) {
                throw new Error('Missing teacher ID or vacancy ID for payment lookup');
            }
            
            console.log('Looking for payment records with IDs:', {
                teacherIds,
                applicationId,
                vacancyId
            });
    
            // Find payment records with multiple possible teacher IDs
            const paymentRecords = budgetData.filter(entry => {
                // Check if entry is a payment
                if (entry.type !== 'payment') return false;
                
                // Check if the vacancy matches
                const vacancyMatches = 
                    entry.vacancyId === vacancyId || 
                    entry.vacancyId?.toString() === vacancyId?.toString();
                
                if (!vacancyMatches) return false;
                
                // Check if any of the teacher IDs match
                const teacherMatches = teacherIds.some(id => 
                    entry.teacherId === id || 
                    entry.teacherId?.toString() === id?.toString() ||
                    entry.applicationId === id ||
                    entry.applicationId?.toString() === id?.toString()
                );
                
                // Also check if applicationId matches when available
                const applicationMatches = applicationId && entry.applicationId && 
                    (entry.applicationId === applicationId || 
                     entry.applicationId?.toString() === applicationId?.toString());
                
                return teacherMatches || applicationMatches;
            });
            
            console.log('Found payment records:', paymentRecords);
            
            // Declare originalPayment variable
            let originalPayment;
            
            // If no payment records found, check if there are any payments for this vacancy at all
            if (paymentRecords.length === 0) {
                const anyVacancyPayments = budgetData.filter(entry => 
                    entry.type === 'payment' && 
                    (entry.vacancyId === vacancyId || 
                     entry.vacancyId?.toString() === vacancyId?.toString())
                );
                
                console.log('All payments for this vacancy:', anyVacancyPayments);
                
                // Still show warning for admin, but proceed
                Modal.confirm({
                    title: 'No Payment Record Found',
                    content: 'No payment record was found for this teacher and vacancy. Do you want to proceed with the refund anyway?',
                    okText: 'Proceed Anyway',
                    cancelText: 'Cancel',
                    onOk() {
                        // Create a dummy payment record
                        originalPayment = {
                            _id: 'admin-override',
                            teacherId: teacherIds[0],
                            teacherName: application?.teacher?.fullName || teacher?.fullName || 'Unknown Teacher',
                            vacancyId,
                            vacancyTitle: vacancy?.title || 'Unknown Vacancy',
                            amount: 0, // Unknown amount
                            date: new Date().toISOString(),
                            type: 'payment',
                            isAdminOverride: true
                        };
                        
                        setSelectedRefundTeacher({
                            teacher: application?.teacher || teacher,
                            vacancy,
                            application,
                            originalPayment
                        });
                        setRefundFormVisible(true);
                    }
                });
                return;
            } else {
                // Use the most recent payment record
                originalPayment = paymentRecords.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                )[0];
                
                setSelectedRefundTeacher({
                    teacher: application?.teacher || teacher,
                    vacancy,
                    application,
                    originalPayment
                });
                setRefundFormVisible(true);
            }
        } catch (error) {
            console.error('Error looking for payment records:', error);
            message.error('Failed to find payment records: ' + error.message);
        }
    };

    const handleRefundSubmit = async (values) => {
        try {
            setLoading(true);
            
            if (!selectedRefundTeacher?.originalPayment) {
                console.log('Original payment record not found, proceeding as admin override');
                // Create a dummy payment record
                selectedRefundTeacher = {
                    ...selectedRefundTeacher,
                    originalPayment: {
                        _id: 'admin-override',
                        amount: 0,
                        isAdminOverride: true
                    }
                };
            }

            // Log payment record for debugging
            console.log('Using original payment record:', selectedRefundTeacher.originalPayment);

            // For admin override cases, skip the existing refund check
            if (!selectedRefundTeacher.originalPayment.isAdminOverride) {
                // Check if refund already exists for this payment
                const existingRefund = budgetData.find(
                    entry => 
                        entry.type === 'refund' && 
                        entry.teacherId === selectedRefundTeacher.teacher._id &&
                        entry.vacancyId === selectedRefundTeacher.vacancy._id
                );

                if (existingRefund) {
                    throw new Error('A refund has already been processed for this payment');
                }
            }

            // Find the vacancy and application details
            let foundVacancy = null;
            let foundApplication = null;
            
            for (const vacancy of vacancies) {
                if (!vacancy.applications) continue;
                
                const application = vacancy.applications.find(app => 
                    app.teacher && app.teacher._id === selectedRefundTeacher.teacher._id &&
                    vacancy._id === selectedRefundTeacher.vacancy._id
                );
                
                if (application) {
                    foundVacancy = vacancy;
                    foundApplication = application;
                    break;
                }
            }

            if (!foundVacancy || !foundApplication) {
                console.warn('Could not find exact application match, using selected teacher data');
                foundApplication = selectedRefundTeacher.application;
            }

            // Check if application is already refunded
            if (foundApplication && foundApplication.status === 'refunded') {
                throw new Error('This application has already been refunded');
            }

            // Get teacher name - ensure we have it from somewhere
            const teacherName = selectedRefundTeacher.teacher.fullName || 
                                selectedRefundTeacher.teacher.name || 
                                'Unknown Teacher';
                                
            // Get vacancy title - ensure we have it from somewhere
            const vacancyTitle = selectedRefundTeacher.vacancy.title || 
                                 'Unknown Vacancy';

            // Create refund entry with all required fields
            const refundEntry = {
                teacherId: selectedRefundTeacher.teacher._id,
                teacherName: teacherName,
                vacancyId: selectedRefundTeacher.vacancy._id,
                vacancyTitle: vacancyTitle,
                amount: parseFloat(values.refundAmount),
                date: new Date().toISOString(),
                reason: values.reason || 'Administrative refund', // Ensure reason is never empty
                isAdminOverride: selectedRefundTeacher.originalPayment.isAdminOverride || false
            };
            
            // Add applicationId only if it exists and is not a synthetic ID
            if (foundApplication && foundApplication._id && !String(foundApplication._id).startsWith('synthetic-')) {
                refundEntry.applicationId = foundApplication._id;
            } else if (selectedRefundTeacher.originalPayment.applicationId) {
                // If the original payment has an applicationId, use that
                refundEntry.applicationId = selectedRefundTeacher.originalPayment.applicationId;
            }
            
            // Only add originalPaymentId if it's not an admin override
            if (!selectedRefundTeacher.originalPayment.isAdminOverride) {
                refundEntry.originalPaymentId = selectedRefundTeacher.originalPayment._id || 
                                                selectedRefundTeacher.originalPayment.id;
            }

            console.log('Final refund entry being sent to API:', JSON.stringify(refundEntry, null, 2));

            try {
                // Use the new processRefund endpoint that handles vacancy status updates
                const response = await apiService.processRefund(refundEntry);
                
                console.log('Refund API response:', response);

                if (!response.success) {
                    throw new Error('Failed to process refund: ' + (response.message || 'Unknown error'));
                }

                // Update local state to reflect the refund
                setVacancies(prev => 
                    prev.map(v => 
                        v._id === selectedRefundTeacher.vacancy._id 
                            ? {
                                ...v,
                                applications: v.applications.map(app =>
                                    (app._id === foundApplication._id) || 
                                    (app.teacher?._id === selectedRefundTeacher.teacher._id)
                                        ? { ...app, status: 'rejected' } // Use 'rejected' for backend compatibility
                                        : app
                                ),
                                // If this vacancy had an accepted application that's now refunded, reset the flag and reopen
                                hasAcceptedApplication: false,
                                status: 'open'
                            }
                            : v
                    )
                );

                // Fetch updated budget data
                await fetchBudgetData();

                message.success('Refund processed successfully');
                setRefundFormVisible(false);
                refundForm.resetFields();
                setSelectedRefundTeacher(null);

                // Keep the active tab as refund
                setBudgetActiveTab('refund');
            } catch (apiError) {
                console.error('API Error details:', apiError);
                if (apiError.response) {
                    console.error('Response data:', apiError.response.data);
                    console.error('Response status:', apiError.response.status);
                    console.error('Response headers:', apiError.response.headers);
                    throw new Error(`API Error: ${apiError.response.status} - ${apiError.response.data?.message || apiError.message}`);
                } else if (apiError.request) {
                    console.error('No response received:', apiError.request);
                    throw new Error('No response received from server');
                } else {
                    throw apiError;
                }
            }
        } catch (error) {
            console.error('Error processing refund:', error);
            message.error(error.message || 'Failed to process refund');
        } finally {
            setLoading(false);
        }
    };

    // Update BudgetSection component to remove debug info
    const BudgetSection = React.memo(() => {
        const handleTabChange = useCallback((newTab) => {
            setBudgetActiveTab(newTab);
        }, []);

        // Add state for expenses modal
        const [expenseModalVisible, setExpenseModalVisible] = useState(false);
        const [expenseForm] = Form.useForm();

        // Memoize filtered data
        const filteredData = useMemo(() => {
            // Apply transaction type filter
            const data = budgetActiveTab === 'all' 
                ? budgetData 
                : budgetData.filter(entry => entry.type === budgetActiveTab);
            
            // Sort by date (newest first)
            return data.sort((a, b) => new Date(b.date) - new Date(a.date));
        }, [budgetData, budgetActiveTab]);

        // Memoize calculations
        const { totalPayments, totalRefunds, totalExpenses, netAmount, pendingAmount } = useMemo(() => {
            const payments = budgetData
                .filter(entry => entry.type === 'payment')
                .reduce((sum, entry) => sum + entry.amount, 0);
                
            const refunds = budgetData
                .filter(entry => entry.type === 'refund')
                .reduce((sum, entry) => sum + entry.amount, 0);
                
            const pending = budgetData
                .filter(entry => entry.type === 'payment' && entry.status === 'partial')
                .reduce((sum, entry) => sum + (entry.remainingAmount || 0), 0);

            const expenses = budgetData
                .filter(entry => entry.type === 'expense')
                .reduce((sum, entry) => sum + entry.amount, 0);

            return {
                totalPayments: payments,
                totalRefunds: refunds,
                totalExpenses: expenses,
                netAmount: payments - refunds - expenses,
                pendingAmount: pending
            };
        }, [budgetData]);

        // Handle adding an expense
        const handleAddExpense = async (values) => {
            try {
                setLoading(true);
                
                // Prepare expense data
                const expenseData = {
                    description: values.description,
                    amount: parseFloat(values.amount),
                    date: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
                    type: 'expense'
                };
                
                // Call API to add expense
                const response = await apiService.createBudgetTransaction({
                    ...expenseData,
                    // These fields are required by the API but won't be used for expenses
                    teacherId: "expense",
                    teacherName: "Expense",
                    vacancyId: "expense",
                    vacancyTitle: values.description,
                    status: 'paid'
                });
                
                if (response.success) {
                    // Close modal and reset form
                    setExpenseModalVisible(false);
                    expenseForm.resetFields();
                    
                    // Refresh budget data
                    await fetchBudgetData();
                    message.success('Expense added successfully');
                } else {
                    throw new Error(response.message || 'Failed to add expense');
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                message.error(error.message || 'Failed to add expense');
            } finally {
                setLoading(false);
            }
        };

        // Check if we have any data
        if (budgetData.length === 0) {
            return (
                <div>
                    <h3>No budget data available</h3>
                    <Button 
                        type="primary" 
                        onClick={fetchBudgetData}
                    >
                        Refresh Budget Data
                    </Button>
                </div>
            );
        }

        return (
            <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={4}>
                        <Card>
                            <Statistic 
                                title="Total Collections" 
                                value={`Rs. ${totalPayments.toLocaleString()}`}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic 
                                title="Total Refunds" 
                                value={`Rs. ${totalRefunds.toLocaleString()}`}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic 
                                title="Total Expenses" 
                                value={`Rs. ${totalExpenses.toLocaleString()}`}
                                valueStyle={{ color: '#ff7a45' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic 
                                title="Pending Collections" 
                                value={`Rs. ${pendingAmount.toLocaleString()}`}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic 
                                title="Net Amount" 
                                value={`Rs. ${netAmount.toLocaleString()}`}
                                valueStyle={{ color: netAmount >= 0 ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Tabs 
                        activeKey={budgetActiveTab} 
                        onChange={handleTabChange}
                        style={{ marginBottom: 16 }}
                    >
                        <TabPane tab="All Transactions" key="all"></TabPane>
                        <TabPane tab="Payments" key="payment"></TabPane>
                        <TabPane tab="Refunds" key="refund"></TabPane>
                        <TabPane tab="Expenses" key="expense"></TabPane>
                    </Tabs>
                    
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => {
                            expenseForm.resetFields();
                            setExpenseModalVisible(true);
                        }}
                    >
                        Add Expense
                    </Button>
                </div>

                <Table 
                    columns={budgetColumns}
                    dataSource={filteredData}
                    rowKey={record => record._id || record.id || JSON.stringify(record)}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                    }}
                />

                {/* Add Expense Modal */}
                <Modal
                    title="Add Expense"
                    open={expenseModalVisible}
                    onCancel={() => setExpenseModalVisible(false)}
                    footer={null}
                >
                    <Form 
                        form={expenseForm} 
                        layout="vertical"
                        onFinish={handleAddExpense}
                    >
                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true, message: 'Please enter expense description' }]}
                        >
                            <Input placeholder="Enter expense description" />
                        </Form.Item>

                        <Form.Item
                            name="amount"
                            label="Amount (Rs.)"
                            rules={[
                                { required: true, message: 'Please enter amount' },
                                { 
                                    validator: (_, value) => {
                                        if (!value || isNaN(value) || parseFloat(value) <= 0) {
                                            return Promise.reject('Please enter a valid amount greater than 0');
                                        }
                                        return Promise.resolve();
                                    } 
                                }
                            ]}
                        >
                            <Input 
                                type="number" 
                                prefix="Rs." 
                                placeholder="Enter amount"
                            />
                        </Form.Item>

                        <Form.Item
                            name="date"
                            label="Date"
                        >
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item>
                            <Space>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    loading={loading}
                                >
                                    Add Expense
                                </Button>
                                <Button onClick={() => setExpenseModalVisible(false)}>
                                    Cancel
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        );
    });

    // Update the items array to include the Budget tab
    const items = [
        {
            key: 'vacancies',
            label: <span><BookOutlined />Vacancies</span>,
            children: (
                <div className="vacancy-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => toggleModal('addVacancy')}
                            className="action-button"
                            size="large"
                        >
                            Add Vacancy
                        </Button>
                        <Input.Search
                            placeholder="Search vacancies..."
                            allowClear
                            onSearch={handleSearch}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ width: 300 }}
                            size="large"
                        />
                    </div>
                    <Table 
                        ref={tableRef}
                        columns={vacancyColumns} 
                        dataSource={vacancies}
                        loading={loading}
                        rowKey="_id"
                        className="main-table"
                        rowClassName={(record, index) => index === highlightedRow ? 'highlighted-row' : ''}
                        onChange={handleTableChange}
                        pagination={false} // Disable built-in pagination
                    />
                    
                    {/* Add Load More button */}
                    {vacancies.length > 0 && hasMore && (
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Button 
                                onClick={loadMoreVacancies} 
                                loading={loadingMore}
                                type="primary"
                            >
                                Load More
                            </Button>
                        </div>
                    )}
                    
                    {/* Show counts */}
                    <div style={{ textAlign: 'right', marginTop: 16, color: '#8c8c8c' }}>
                        Showing {vacancies.length} of {totalVacancies} vacancies
                    </div>
                </div>
            )
        },
        {
            key: 'applications',
            label: <span><UserOutlined />Accepted Teachers</span>,
            children: (
                <>
                    <Card className="stats-card">
                        <Row gutter={[24, 24]} className="stats-row">
                            <Col xs={24} sm={8}>
                                <Statistic 
                                    title="Total Accepted Teachers" 
                                    value={acceptedTeachersData.length} // Use memoized data
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Col>
                            <Col xs={24} sm={8}>
                                <Statistic 
                                    title="Active Teachers" 
                                    value={acceptedTeachersData.filter(t => t.isActive).length} // Use memoized data
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Col>
                            <Col xs={24} sm={8}>
                                <Statistic 
                                    title="Inactive Teachers" 
                                    value={acceptedTeachersData.filter(t => !t.isActive).length} // Use memoized data
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Table 
                        columns={acceptedTeacherColumns} 
                        dataSource={acceptedTeachersData} // Use memoized data
                        loading={loading}
                        rowKey="uniqueKey"
                        className="main-table"
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                            position: ['bottomRight']
                        }}
                    />
                </>
            )
        },
        {
            key: 'budget',
            label: <span><DollarOutlined />Budget</span>,
            children: <BudgetSection />
        }
    ];

    // Render methods

     const renderVacancyForm = () => {
        // Default values
        const defaultValues = {
            featured: false,
            description: "Experienced Teacher with required qualification are requested to apply",
            gender: "any"
        };
        
        // Merge with selected vacancy data if editing
        const initialValues = modalState.selectedVacancy 
            ? { ...defaultValues, ...modalState.selectedVacancy } 
            : defaultValues;
        
        return (
            <Form
                form={form}
                onFinish={handleVacancySubmit}
                initialValues={initialValues}
                layout="vertical"
            >
                <Form.Item
                    name="title"
                    label="Title"
                    rules={[{ required: true, message: 'Please enter title' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="subject"
                    label="Subject"
                    rules={[{ required: true, message: 'Please enter subject' }]}
                >
                    <Input placeholder="Enter subject" />
                </Form.Item>

                <Form.Item
                    name="class"
                    label="Class"
                    rules={[{ required: true, message: 'Please enter class' }]}
                >
                    <Input placeholder="Enter class/grade" />
                </Form.Item>

                <Form.Item
                    name="time"
                    label="Time"
                    rules={[{ required: true, message: 'Please enter preferred time' }]}
                >
                    <Input placeholder="Enter preferred time (e.g., 4 PM - 6 PM)" />
                </Form.Item>

                <Form.Item
                    name="location"
                    label="Location"
                    rules={[{ required: true, message: 'Please enter location' }]}
                >
                    <Input.TextArea 
                        placeholder="Enter detailed location" 
                        rows={2}
                    />
                </Form.Item>

                <Form.Item
                    name="gender"
                    label="Preferred Gender"
                    rules={[{ required: true, message: 'Please select preferred gender' }]}
                >
                    <Select placeholder="Select preferred gender">
                        <Select.Option value="male">Male</Select.Option>
                        <Select.Option value="female">Female</Select.Option>
                        <Select.Option value="any">Any</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                >
                    <Input.TextArea rows={4} />
                </Form.Item>

                <Form.Item
                    name="salary"
                    label="Salary"
                    rules={[{ required: true, message: 'Please enter salary' }]}
                >
                    <Input placeholder="e.g., Rs. 30,000 - 40,000" />
                </Form.Item>

                <Form.Item
                    name="featured"
                    valuePropName="checked"
                >
                    <Checkbox>Show in Homepage</Checkbox>
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {modalState.selectedVacancy ? 'Update' : 'Add'} Vacancy
                        </Button>
                        <Button onClick={() => toggleModal(modalState.selectedVacancy ? 'editVacancy' : 'addVacancy')}>
                            Cancel
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        );
     };

    // Restore the updateApplicationStatus function
    const updateApplicationStatus = async (applicationId, status, vacancyId) => {
        try {
            console.log(`Updating application ${applicationId} to ${status} for vacancy ${vacancyId || 'unknown'}`);

            const response = await apiService.updateApplicationStatus(applicationId, status, vacancyId);

            if (response && response.success) {
                // Update local state
                let teacherId = null;
                
                setVacancies(prevVacancies => {
                    return prevVacancies.map(vacancy => {
                        if (vacancy.applications) {
                            const updatedApplications = vacancy.applications.map(app => {
                                if (app._id === applicationId) {
                                    // If this is the application we're updating, extract the teacherId
                                    if (app.teacher && app.teacher._id && status === 'accepted') {
                                        teacherId = app.teacher._id;
                                    }
                                    return { 
                                        ...app, 
                                        status,
                                        // If accepting, set isActive to true
                                        isActive: status === 'accepted' ? true : app.isActive 
                                    };
                                }
                                return app;
                            });
                            return { ...vacancy, applications: updatedApplications };
                        }
                        return vacancy;
                    });
                });

                // If accepting an application, also set the teacher as active
                if (status === 'accepted' && teacherId) {
                    try {
                        console.log(`Setting teacher ${teacherId} as active because application was accepted`);
                        await apiService.updateTeacherActiveStatus(teacherId, true);
                        
                        // Update teacher state as well
                        setTeachers(prevTeachers => 
                            prevTeachers.map(teacher => 
                                teacher._id === teacherId 
                                    ? { ...teacher, isActive: true }
                                    : teacher
                            )
                        );
                    } catch (activeError) {
                        console.error('Failed to set teacher as active:', activeError);
                        // Don't throw error here, as the main acceptance was successful
                    }
                }

                return response;
            } else {
                throw new Error(response?.message || 'Failed to update application status');
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            throw error;
        }
    };

    // Add the handleMarkAsPaid function
    const handleMarkAsPaid = async (transactionId) => {
        setUpdatingId(transactionId); // Set loading state for the specific button
        try {
            const response = await apiService.updateBudgetTransactionStatus(transactionId, 'paid');
            if (response.success) {
                message.success('Payment marked as paid successfully!');
                // Refresh budget data to show the updated status
                await fetchBudgetData(); 
            } else {
                message.error(response.message || 'Failed to update payment status.');
            }
        } catch (error) {
            // Error message might be handled by apiService, but log just in case
            console.error('Error marking payment as paid:', error);
            // Optionally show a generic error message if not handled by apiService
            if (!error.response) { 
                 message.error('An error occurred while marking payment as paid.');
            }
        } finally {
            setUpdatingId(null); // Clear loading state
        }
    };

    // Add the handleCopyVacancy function before the return statement
    const handleCopyVacancy = (vacancy) => {
        try {
            // Format the vacancy details
            const formattedText = `
Dear Sir Home Tuition - Vacancy
---------------------------
*Title : * ${vacancy.title}
*Subject : * ${vacancy.subject}
*Class : * ${vacancy.class}a
*Time : * ${vacancy.time}
*Location : * ${vacancy.location}
*Gender : * ${vacancy.gender === 'any' ? 'Any' : vacancy.gender.charAt(0).toUpperCase() + vacancy.gender.slice(1)}
*Salary : * ${vacancy.salary}
*Description : * ${vacancy.description}

Apply now: https://dearsirhometuition.com/Apply/vacancy.html?id=${vacancy._id}
`;

            // Copy to clipboard
            navigator.clipboard.writeText(formattedText)
                .then(() => {
                    message.success('Vacancy details copied to clipboard!');
                })
                .catch((err) => {
                    console.error('Failed to copy: ', err);
                    message.error('Failed to copy vacancy details.');
                });
        } catch (error) {
            console.error('Error copying vacancy details:', error);
            message.error('Failed to copy vacancy details.');
        }
    };

    // Add function to copy parent details associated with a vacancy
    const handleCopyParentDetails = async (vacancy) => {
        try {
            if (!vacancy.parentId) {
                message.info('This vacancy is not linked to a parent application.');
                return;
            }

            setLoading(true);
            console.log('Fetching parent details for parentId:', vacancy.parentId);
            
            // Check token
            const token = localStorage.getItem('adminToken');
            if (!token) {
                message.error('Authentication token not found. Please log in again.');
                return;
            }
            
            // Get base URL
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            
            try {
                // Get all parents and find the one with matching ID
                console.log(`Fetching all parents from ${baseUrl}/api/parents/all`);
                const response = await fetch(`${baseUrl}/api/parents/all`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch parents: ${response.status} - ${errorText}`);
                }
                
                const allParentsData = await response.json();
                console.log('Got all parents, count:', allParentsData.data?.length || 0);
                
                if (!allParentsData.success || !allParentsData.data || !Array.isArray(allParentsData.data)) {
                    throw new Error('Invalid response format from all parents endpoint');
                }
                
                // Find the parent with matching ID
                const parent = allParentsData.data.find(p => p._id === vacancy.parentId);
                
                if (!parent) {
                    throw new Error(`Could not find parent with ID ${vacancy.parentId} in the list of all parents`);
                }
                
                console.log('Found parent:', parent);
                
                // Store the parent data and show the modal
                setSelectedParent({
                    ...parent,
                    vacancyTitle: vacancy.title
                });
                setParentDetailsVisible(true);
                
                // Format the parent details for clipboard
                const formattedText = `
Dear Sir Home Tuition - Parent Details (Vacancy: ${vacancy.title})
-------------------------------------------------------------
*Name : * ${parent.parentName || 'N/A'}
*Phone : * ${parent.phone || 'N/A'}
*Address : * ${parent.address || 'N/A'}
*Grade : * ${parent.grade ? `Grade ${parent.grade}` : 'N/A'}
*Subjects : * ${parent.subjects ? (Array.isArray(parent.subjects) ? parent.subjects.join(', ') : parent.subjects) : 'N/A'}
*Preferred Teacher : * ${parent.preferredTeacher ? parent.preferredTeacher.charAt(0).toUpperCase() + parent.preferredTeacher.slice(1) : 'N/A'}
*Preferred Time : * ${parent.preferredTime || 'N/A'}
*Salary Offered : * ${parent.salary || 'Negotiable'}
`;

                // Copy to clipboard
                await navigator.clipboard.writeText(formattedText);
                message.success('Parent details copied to clipboard!');
                
            } catch (error) {
                console.error('Error fetching parents:', error);
                
                // Fallback: Check if parentId is actually an embedded object
                if (typeof vacancy.parentId === 'object' && vacancy.parentId !== null) {
                    console.log('Using embedded parent object:', vacancy.parentId);
                    const parent = vacancy.parentId;
                    
                    // Store the parent data and show the modal
                    setSelectedParent({
                        ...parent,
                        vacancyTitle: vacancy.title
                    });
                    setParentDetailsVisible(true);
                    
                    // Format the parent details for clipboard
                    const formattedText = `
Dear Sir Home Tuition - Parent Details (Vacancy: ${vacancy.title})
-------------------------------------------------------------
*Name : * ${parent.parentName || 'N/A'}
*Phone : * ${parent.phone || 'N/A'}
*Address : * ${parent.address || 'N/A'}
*Grade : * ${parent.grade ? `Grade ${parent.grade}` : 'N/A'}
*Subjects : * ${parent.subjects ? (Array.isArray(parent.subjects) ? parent.subjects.join(', ') : parent.subjects) : 'N/A'}
*Preferred Teacher : * ${parent.preferredTeacher ? parent.preferredTeacher.charAt(0).toUpperCase() + parent.preferredTeacher.slice(1) : 'N/A'}
*Preferred Time : * ${parent.preferredTime || 'N/A'}
*Salary Offered : * ${parent.salary || 'Negotiable'}
*Status : * ${parent.status ? parent.status.toUpperCase() : 'N/A'}
`;

                    // Copy to clipboard
                    await navigator.clipboard.writeText(formattedText);
                    message.success('Parent details copied to clipboard!');
                } else {
                    message.error('Could not find parent details. The parent may have been deleted.');
                }
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error in handleCopyParentDetails:', error);
            message.error(error.message || 'Failed to fetch or copy parent details.');
            setLoading(false);
        }
    };

    // Add this useEffect to refresh budget data when teachers data changes
    useEffect(() => {
        // If we have teachers data loaded, refresh budget data to enhance with teacher details
        if (teachers && teachers.length > 0) {
            fetchBudgetData();
        }
    }, [teachers]);

    // Add a helper function to map known teacher names to phone numbers
    const getTeacherPhoneByName = (teacherName) => {
        // This is a fallback for the demo to ensure phone numbers display properly
        // In a production environment, this would be replaced with proper data from the database
        const knownTeachers = {
            'a': '9876543210', // Demo phone for teacher 'a'
            'kamla Pandey': '8765432109', // Demo phone for Kamla Pandey
            // Add more mappings as needed for testing
        };
        
        if (teacherName && knownTeachers[teacherName]) {
            return knownTeachers[teacherName];
        }
        
        return null;
    };

    // Add this function at the end of component but before the return statement
    const debugBudgetData = () => {
        console.log('========= DEBUG BUDGET DATA =========');
        console.log('Total budget entries:', budgetData.length);
        
        // Group by type
        const refunds = budgetData.filter(entry => entry.type === 'refund');
        const payments = budgetData.filter(entry => entry.type === 'payment');
        console.log('Refunds:', refunds.length, 'Payments:', payments.length);
        
        // Sample of each type
        if (refunds.length > 0) {
            console.log('Sample refund:', {
                _id: refunds[0]._id,
                teacherId: refunds[0].teacherId,
                teacherId_type: typeof refunds[0].teacherId,
                teacherIdString: String(refunds[0].teacherId),
                vacancyId: refunds[0].vacancyId,
                vacancyId_type: typeof refunds[0].vacancyId,
                vacancyIdString: String(refunds[0].vacancyId)
            });
        }
        
        if (payments.length > 0) {
            console.log('Sample payment:', {
                _id: payments[0]._id,
                teacherId: payments[0].teacherId,
                teacherId_type: typeof payments[0].teacherId,
                teacherIdString: String(payments[0].teacherId),
                vacancyId: payments[0].vacancyId,
                vacancyId_type: typeof payments[0].vacancyId,
                vacancyIdString: String(payments[0].vacancyId)
            });
        }
        
        // Show multiple entries for the same teacher/vacancy
        const teacherCounts = {};
        budgetData.forEach(entry => {
            const key = `${entry.teacherId}-${entry.vacancyId}`;
            teacherCounts[key] = (teacherCounts[key] || 0) + 1;
        });
        
        // Find entries with multiple records
        const multipleEntries = Object.entries(teacherCounts)
            .filter(([_, count]) => count > 1)
            .map(([key]) => key);
        
        console.log('Teachers with multiple entries:', multipleEntries.length);
        
        if (multipleEntries.length > 0) {
            const [teacherId, vacancyId] = multipleEntries[0].split('-');
            const entries = budgetData.filter(entry => 
                String(entry.teacherId) === String(teacherId) && 
                String(entry.vacancyId) === String(vacancyId)
            );
            
            console.log('Example of multiple entries for same teacher/vacancy:');
            entries.forEach((entry, i) => {
                console.log(`Entry ${i + 1}:`, {
                    type: entry.type,
                    teacherId: String(entry.teacherId),
                    vacancyId: String(entry.vacancyId),
                    amount: entry.amount,
                    date: entry.date
                });
            });
        }
        
        console.log('====================================');
    }

    // Call this in useEffect after fetching data
    useEffect(() => {
        // If we have budget data loaded, run the debug function
        if (budgetData && budgetData.length > 0) {
            debugBudgetData();
        }
    }, [budgetData]);

    // Add ID normalization utility functions
    const normalizeId = (id) => {
        if (id === null || id === undefined) return '';
        return String(id).trim();
    };

    // Utility function to check if two IDs match with multiple strategies
    const doIdsMatch = (id1, id2) => {
        // Normalize both IDs
        const normalizedId1 = normalizeId(id1);
        const normalizedId2 = normalizeId(id2);
        
        // Skip if either ID is empty
        if (!normalizedId1 || !normalizedId2) return false;
        
        // Try exact match first
        if (normalizedId1 === normalizedId2) return true;
        
        // Try substring match
        if (normalizedId1.includes(normalizedId2) || normalizedId2.includes(normalizedId1)) {
            return true;
        }
        
        // MongoDB ObjectIDs can be 24 characters or 12 bytes
        // Try matching just the first 12 chars if both are long enough
        if (normalizedId1.length >= 12 && normalizedId2.length >= 12) {
            if (normalizedId1.substring(0, 12) === normalizedId2.substring(0, 12)) {
                return true;
            }
        }
        
        return false;
    };

    // Add this after the fetchData function, before the useEffect hooks
    const checkAndUpdateVacancyStatus = useCallback(async (vacancyId) => {
        // Find the vacancy by ID
        const vacancy = vacancies.find(v => v._id === vacancyId);
        
        // If not found or already closed, do nothing
        if (!vacancy || vacancy.status === 'closed') {
            return;
        }
        
        // Check if applications count is 9 or more
        const applicationsCount = vacancy.applications?.length || 0;
        if (applicationsCount >= 9 && vacancy.status !== 'closed') {
            console.log(`Vacancy ${vacancy.title} has ${applicationsCount} applicants. Auto-closing...`);
            
            try {
                // Update the vacancy status to closed
                const response = await apiService.updateVacancyStatus(vacancyId, 'closed');
                
                if (response.success) {
                    message.success(`Vacancy "${vacancy.title}" automatically closed as it reached ${applicationsCount} applicants`);
                    
                    // Update local state
                    setVacancies(prev => 
                        prev.map(v => 
                            v._id === vacancyId 
                                ? { ...v, status: 'closed' }
                                : v
                        )
                    );
                }
            } catch (error) {
                console.error('Failed to auto-close vacancy:', error);
            }
        }
    }, [vacancies]);

    // Add a useEffect to check vacancies when they're updated
    useEffect(() => {
        // Check each vacancy
        vacancies.forEach(vacancy => {
            if (vacancy.applications?.length >= 9 && vacancy.status !== 'closed') {
                checkAndUpdateVacancyStatus(vacancy._id);
            }
        });
    }, [vacancies, checkAndUpdateVacancyStatus]);

    // Add this function before the return statement
    const handleAddApplicant = async (values) => {
        try {
            if (!selectedVacancy?._id) {
                message.error('No vacancy selected');
                return;
            }

            setLoading(true);

            // Call the API to add the applicant
            const response = await apiService.addApplicantManually(
                selectedVacancy._id,
                {
                    fullName: values.fullName,
                    phone: values.phone,
                    email: 'manual@entry.com' // Default email
                }
            );

            if (response.success) {
                // Add the new applicant to the local state
                const newApplicant = {
                    ...response.data.teacher,
                    status: 'pending',
                    appliedAt: new Date().toISOString(),
                    _id: response.data.application._id // Use the application ID for the table key
                };
                
                setSelectedVacancyApplicants(prev => [...prev, newApplicant]);
                
                // Close the modal and reset form
                setAddApplicantModalVisible(false);
                addApplicantForm.resetFields();
                
                message.success(`Applicant ${values.fullName} added successfully`);
            } else {
                throw new Error(response.message || 'Failed to add applicant');
            }
        } catch (error) {
            console.error('Failed to add applicant:', error);
            message.error(error.message || 'Failed to add applicant');
        } finally {
            setLoading(false);
        }
    };

    // Add these helper functions before the applicantColumns definition
    const isTeacherFollowup = (teacherId) => {
        return !!followupTeachers[teacherId];
    };

    const toggleFollowupStatus = (teacherId) => {
        setFollowupTeachers(prev => {
            const newState = {...prev};
            newState[teacherId] = !prev[teacherId];
            
            try {
                // Calculate expiry date (365 days from now)
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 365);
                const expiryTime = expiryDate.getTime();
                
                // Get existing data from localStorage
                const existingData = JSON.parse(localStorage.getItem('teacherFollowups') || '{}');
                
                // Update with new data
                if (newState[teacherId]) {
                    existingData[teacherId] = {
                        added: new Date().getTime(),
                        expiry: expiryTime
                    };
                } else {
                    // Remove if toggled off
                    delete existingData[teacherId];
                }
                
                // Save back to localStorage
                localStorage.setItem('teacherFollowups', JSON.stringify(existingData));
            } catch (error) {
                console.error('Error saving followup status to localStorage:', error);
            }
            
            return newState;
        });
        
        // Here you would add API call to update the followup status in the backend
        // For example:
        // apiService.updateFollowupStatus(teacherId, !followupTeachers[teacherId]);
        
        message.success(`${!followupTeachers[teacherId] ? 'Added to' : 'Removed from'} followup`);
    };

    // Add a function to load more vacancies
    const loadMoreVacancies = () => {
        const nextPage = vacancyPage + 1;
        setVacancyPage(nextPage);
        fetchData(false, nextPage, true);
    };

    return (
        <div className="teacher-list">
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                items={items}
            />

            {/* Modals */}
            <Modal
                title={modalState.selectedVacancy ? "Edit Vacancy" : "Add New Vacancy"}
                open={modalState.addVacancy || modalState.editVacancy}
                onCancel={() => toggleModal(modalState.selectedVacancy ? 'editVacancy' : 'addVacancy')}
                footer={null}
            >
                {renderVacancyForm()}
            </Modal>

            <Modal
                title={`Vacancy Applicants ${selectedVacancy?.status === 'closed' ? '(CLOSED)' : '(OPEN)'}`}
                open={applicantsModalVisible}
                onCancel={() => {
                    setApplicantsModalVisible(false);
                    setSelectedVacancy(null);
                    setSelectedVacancyApplicants([]);
                }}
                footer={null}
                width={1200}
                style={{
                    top: 20
                }}
            >
                {selectedVacancy?.hasAcceptedApplication && (
                    <div style={{ marginBottom: 16, backgroundColor: '#f6ffed', padding: 10, border: '1px solid #b7eb8f', borderRadius: 4 }}>
                        <strong>Note:</strong> This vacancy already has an accepted application. Other applications cannot be accepted.
                    </div>
                )}
                
                {!selectedVacancy?.hasAcceptedApplication && selectedVacancyApplicants.some(app => app.hasRefund) && (
                    <div style={{ marginBottom: 16, backgroundColor: '#e6f7ff', padding: 10, border: '1px solid #91d5ff', borderRadius: 4 }}>
                        <strong>Note:</strong> A refund has been processed. You can now accept another application.
                    </div>
                )}
                
                {selectedVacancy?.status === 'closed' && !selectedVacancy?.hasAcceptedApplication && (
                    <div style={{ marginBottom: 16, backgroundColor: '#fff7e6', padding: 10, border: '1px solid #ffd591', borderRadius: 4 }}>
                        <strong>Note:</strong> This vacancy is currently closed. To accept applications, please reopen it.
                    </div>
                )}
                
                {/* Display vacancy title and location */}
                <div style={{ marginBottom: 16, backgroundColor: '#f6f6f6', padding: 10, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            <div>
                                <strong>Vacancy Title:</strong> {selectedVacancy?.title || 'N/A'}
                            </div>
                            <div>
                                <strong>Location:</strong> {selectedVacancy?.location || 'N/A'}
                            </div>
                        </div>
                        <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<PlusOutlined />} 
                            onClick={() => {
                                // Reset the form first
                                addApplicantForm.resetFields();
                                // Then show the modal
                                setAddApplicantModalVisible(true);
                            }}
                            title="Add Applicant"
                        />
                    </div>
                </div>
                
                <Table
                    columns={applicantColumns}
                    dataSource={selectedVacancyApplicants}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                    }}
                />
            </Modal>
                
  


<Modal
    title="CV Preview"
    open={cvModalVisible}
    onCancel={() => {
        setCvModalVisible(false);
        setSelectedCvUrl(null);
    }}
    footer={null}
    width="90%"
    style={{ 
        top: 20,
        maxWidth: 1200,
        height: 'calc(100vh - 40px)'
    }}
    bodyStyle={{ 
        height: 'calc(100vh - 140px)',
        padding: '12px',
        overflow: 'hidden'
    }}
    className="cv-modal"
    centered
>
    {selectedCvUrl && (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="cv-modal-header" style={{ marginBottom: '10px' }}>
                <Space>
                    <Button 
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadCV(selectedCvUrl)}
                    >
                        Download
                    </Button>
                    <Button 
                        onClick={() => {
                            setCvModalVisible(false);
                            setSelectedCvUrl(null);
                        }}
                    >
                        Close
                    </Button>
                </Space>
            </div>
            {selectedCvUrl && selectedCvUrl.includes('google.com/gview') ? (
                <iframe
                    src={selectedCvUrl}
                    style={{ 
                        width: '100%', 
                        height: 'calc(100% - 50px)', 
                        border: 'none',
                        flex: 1
                    }}
                    title="CV Preview"
                    frameBorder="0"
                    allowFullScreen
                />
            ) : getFileType(selectedCvUrl) === 'image' ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                    overflow: 'auto'
                }}>
                    <img 
                        src={selectedCvUrl}
                        alt="CV Preview" 
                        style={{
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 200px)',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            ) : (
                <object
                    data={selectedCvUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{
                        flex: 1,
                        minHeight: 'calc(100vh - 200px)'
                    }}
                >
                    <p>
                        Your browser does not support PDF viewing. 
                        <a href={selectedCvUrl} target="_blank" rel="noreferrer">Click here to download the PDF</a>.
                    </p>
                </object>
            )}
        </div>
    )}
</Modal>

            {/* Teacher Details Modal */}
            <Modal
                title="Teacher Details"
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={null}
                width={800} // Keep width or adjust if needed
            >
                {selectedTeacher && (
                    <div className="teacher-details">
                        <h2>{selectedTeacher.fullName}</h2>
                        <Row gutter={[16, 16]}>
                            {/* Column 1: Basic Info */}
                            <Col span={12}>
                                <div className="detail-row"><strong>Email:</strong> {selectedTeacher.email}</div>
                                <div className="detail-row"><strong>Phone:</strong> {selectedTeacher.phone}</div>
                                <div className="detail-row"><strong>Subjects:</strong> {selectedTeacher.subjects?.map(subject => <Tag key={subject} color="blue">{subject}</Tag>) || 'N/A'}</div>
                                <div className="detail-row"><strong>CV:</strong> 
                                    {selectedTeacher.cv ? (
                                        <Button icon={<FilePdfOutlined />} onClick={() => handleViewCV(selectedTeacher.cv)}>View CV</Button>
                                    ) : (
                                        'Not Available'
                                    )}
                        </div>
                            </Col>
                            {/* Column 2: Applied Vacancies with Payment Status */}
                            <Col span={12}>
                        <div className="detail-row">
                                    <strong>Applied Vacancies & Status:</strong>
                                    <ul style={{ paddingLeft: '20px', marginTop: '5px', listStyle: 'none' }}>
                                        {(() => {
                                            const appliedToList = vacancies
                                                .filter(vac => vac.applications?.some(app => app.teacher?._id === selectedTeacher._id))
                                                .map(vac => {
                                                    const application = vac.applications.find(app => app.teacher?._id === selectedTeacher._id);
                                                    if (!application) return null; // Skip if no application found

                                                    // Find the relevant payment status from budgetData
                                                    const relevantBudgetEntries = budgetData
                                                        .filter(entry => entry.teacherId === selectedTeacher._id && entry.vacancyId === vac._id)
                                                        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
                                                    
                                                    const latestBudgetEntry = relevantBudgetEntries[0]; // Get the latest entry
                                                    
                                                    let paymentStatusTag = null;
                                                    if (relevantBudgetEntries.length > 0) {
                                                        // Count payments and refunds
                                                        const payments = relevantBudgetEntries.filter(entry => entry.type === 'payment');
                                                        const refunds = relevantBudgetEntries.filter(entry => entry.type === 'refund');
                                                        
                                                        // Handle multiple payment statuses
                                                        if (refunds.length > 0 && payments.length > 0) {
                                                            paymentStatusTag = (
                                                                <span>
                                                                    <Tag color="green">Paid{payments.length > 1 ? ` (${payments.length})` : ''}</Tag>
                                                                    <Tag color="red">Refunded{refunds.length > 1 ? ` (${refunds.length})` : ''}</Tag>
                                                                </span>
                                                            );
                                                        } else if (refunds.length > 0) {
                                                            paymentStatusTag = <Tag color="red">Refunded{refunds.length > 1 ? ` (${refunds.length})` : ''}</Tag>;
                                                        } else if (payments.length > 0) {
                                                            // Check if any are partial
                                                            const hasPartial = payments.some(p => p.status === 'partial');
                                                            if (hasPartial) {
                                                                paymentStatusTag = <Tag color="orange">Partial</Tag>;
                                                            } else {
                                                                paymentStatusTag = <Tag color="green">Paid{payments.length > 1 ? ` (${payments.length})` : ''}</Tag>;
                                                            }
                                                        }
                                                    } else if (application.status === 'accepted') {
                                                        // If accepted but no payment record found
                                                        paymentStatusTag = <Tag color="blue">Payment Pending</Tag>;
                                                    }

                                                    return (
                                                        <li key={vac._id} style={{ marginBottom: '8px' }}>
                                                            {vac.title || 'Untitled Vacancy'} <br />
                                                            <Tag color={getStatusColor(application.status || 'pending')} style={{ marginRight: '5px' }}>
                                                                {(application.status || 'pending').toUpperCase()}
                            </Tag>
                                                            {/* Only show payment status if relevant (e.g., not for pending/rejected apps) */}
                                                            {(application.status === 'accepted' || latestBudgetEntry?.status === 'refunded') && paymentStatusTag}
                                                        </li>
                                                    );
                                                })
                                                .filter(Boolean);
                                            
                                            if (appliedToList.length === 0) {
                                                return <li>No applications found</li>;
                                            }
                                            return appliedToList;
                                        })()}
                                    </ul>
                        </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>

            {/* Add Payment Confirmation Modal */}
            <Modal
                title="Payment Confirmation"
                open={paymentConfirmationVisible}
                onCancel={() => {
                    setPaymentConfirmationVisible(false);
                    setPendingAcceptData(null);
                }}
                footer={null}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <h3>Has the teacher paid the full amount?</h3>
                    <Space size="large" style={{ marginTop: 20 }}>
                        <Button type="primary" onClick={() => handlePaymentResponse(true)}>
                            Yes
                            </Button>
                        <Button onClick={() => handlePaymentResponse(false)}>
                            No
                        </Button>
                    </Space>
                        </div>
            </Modal>

            {/* Payment Amount Modal */}
            <Modal
                title="Enter Payment Amount"
                open={paymentAmountVisible}
                onCancel={() => {
                    setPaymentAmountVisible(false);
                    setPaymentAmount('');
                    setPendingAcceptData(null);
                }}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setPaymentAmountVisible(false);
                        setPaymentAmount('');
                        setPendingAcceptData(null);
                    }}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handlePaymentAmountSubmit}>
                        Submit
                    </Button>
                ]}
            >
                <div style={{ padding: '20px 0' }}>
                    <Form layout="vertical">
                        <Form.Item
                            label="Payment Amount (Rs.)"
                            required
                            validateStatus={paymentAmount && !isNaN(paymentAmount) ? 'success' : 'error'}
                            help={paymentAmount && !isNaN(paymentAmount) ? '' : 'Please enter a valid amount'}
                        >
                            <Input
                                prefix="Rs."
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </Form.Item>
                    </Form>
                    </div>
            </Modal>

            {/* Add Refund Form Modal */}
            <Modal
                title="Process Refund"
                open={refundFormVisible}
                onCancel={() => {
                    setRefundFormVisible(false);
                    refundForm.resetFields();
                    setSelectedRefundTeacher(null);
                }}
                footer={null}
            >
                <Form
                    form={refundForm}
                    onFinish={handleRefundSubmit}
                    layout="vertical"
                >
                    <div style={{ marginBottom: 16 }}>
                        <p><strong>Teacher:</strong> {selectedRefundTeacher?.teacher.fullName}</p>
                        <p><strong>Vacancy:</strong> {selectedRefundTeacher?.vacancy.title}</p>
                        {selectedRefundTeacher?.originalPayment?.isAdminOverride ? (
                            <div style={{ 
                                backgroundColor: '#fffbe6', 
                                padding: '10px', 
                                border: '1px solid #faad14',
                                borderRadius: '4px',
                                marginBottom: '10px'
                            }}>
                                <p style={{ color: '#d4b106', margin: 0 }}>
                                    <strong>Warning:</strong> No original payment record was found. This refund is being processed as an administrative override.
                                </p>
                            </div>
                        ) : (
                            <p><strong>Original Payment:</strong> Rs. {selectedRefundTeacher?.originalPayment?.amount.toLocaleString()}</p>
                        )}
                    </div>

                    <Form.Item
                        name="refundAmount"
                        label="Refund Amount"
                        rules={[
                            { required: true, message: 'Please enter refund amount' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || value <= 0) {
                                        return Promise.reject('Amount must be greater than 0');
                                    }
                                    if (selectedRefundTeacher?.originalPayment && 
                                        !selectedRefundTeacher.originalPayment.isAdminOverride && 
                                        value > selectedRefundTeacher.originalPayment.amount) {
                                        return Promise.reject('Refund cannot exceed original payment');
                                    }
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Input
                            prefix="Rs."
                            type="number"
                            placeholder="Enter refund amount"
                        />
                    </Form.Item>

                    <Form.Item
                        name="reason"
                        label="Reason for Refund"
                        initialValue="Administrative refund"
                        rules={[{ required: true, message: 'Please enter reason for refund' }]}
                    >
                        <Input.TextArea 
                            rows={4}
                            placeholder="Enter reason for refund"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {selectedRefundTeacher?.originalPayment?.isAdminOverride ? 'Process Admin Override Refund' : 'Process Refund'}
                            </Button>
                            <Button onClick={() => {
                                setRefundFormVisible(false);
                                refundForm.resetFields();
                                setSelectedRefundTeacher(null);
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Partial Payment Modal */}
            <Modal
                title="Enter Partial Payment Details"
                open={partialPaymentVisible}
                onCancel={() => {
                    setPartialPaymentVisible(false);
                    partialPaymentForm.resetFields();
                    setPendingAcceptData(null);
                }}
                footer={null}
            >
                <Form
                    form={partialPaymentForm}
                    onFinish={handlePartialPaymentSubmit}
                    layout="vertical"
                >
                    <Form.Item
                        name="amountPaid"
                        label="Amount Paid (Rs.)"
                       
                    >
                        <Input
                            prefix="Rs."
                            type="number"
                            placeholder="Enter amount paid"
                        />
                    </Form.Item>

                    <Form.Item
                        name="amountLeft"
                        label="Amount Left (Rs.)"
                       
                    >
                        <Input
                            prefix="Rs."
                            type="number"
                            placeholder="Enter remaining amount"
                        />
                    </Form.Item>

                    <Form.Item
                        name="dueDate"
                        label="Due Date"
                        rules={[
                            { required: true, message: 'Please select the due date' },
                            {
                                validator: async (_, value) => {
                                    if (value && new Date(value) <= new Date()) {
                                        throw new Error('Due date must be in the future');
                                    }
                                }
                            }
                        ]}
                    >
                        <Input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Submit
                            </Button>
                            <Button onClick={() => {
                                setPartialPaymentVisible(false);
                                partialPaymentForm.resetFields();
                                setPendingAcceptData(null);
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Parent Details Modal */}
            <Modal
                title={`Parent Details for Vacancy: ${selectedParent?.vacancyTitle || ''}`}
                open={parentDetailsVisible}
                onCancel={() => {
                    setParentDetailsVisible(false);
                    setSelectedParent(null);
                }}
                footer={[
                    <Button 
                        key="copy" 
                        type="primary" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                            // Format the parent details for clipboard again
                            if (!selectedParent) return;
                            
                            const formattedText = `
Dear Sir Home Tuition - Parent Details (Vacancy: ${selectedParent.vacancyTitle || ''})
-------------------------------------------------------------
Name: ${selectedParent.parentName || 'N/A'}
Phone: ${selectedParent.phone || 'N/A'}
Address: ${selectedParent.address || 'N/A'}
Grade: ${selectedParent.grade ? `Grade ${selectedParent.grade}` : 'N/A'}
Subjects: ${selectedParent.subjects ? (Array.isArray(selectedParent.subjects) ? selectedParent.subjects.join(', ') : selectedParent.subjects) : 'N/A'}
Preferred Teacher: ${selectedParent.preferredTeacher ? selectedParent.preferredTeacher.charAt(0).toUpperCase() + selectedParent.preferredTeacher.slice(1) : 'N/A'}
Preferred Time: ${selectedParent.preferredTime || 'N/A'}
Salary Offered: ${selectedParent.salary || 'Negotiable'}
Status: ${selectedParent.status ? selectedParent.status.toUpperCase() : 'N/A'}
`;
                            
                            navigator.clipboard.writeText(formattedText)
                                .then(() => message.success('Parent details copied to clipboard!'))
                                .catch(() => message.error('Failed to copy parent details.'));
                        }}
                    >
                        Copy Details
                    </Button>,
                    <Button key="close" onClick={() => {
                        setParentDetailsVisible(false);
                        setSelectedParent(null);
                    }}>
                        Close
                    </Button>
                ]}
            >
                {selectedParent && (
                    <div>
                        <p><strong>Name:</strong> {selectedParent.parentName}</p>
                        <p><strong>Phone:</strong> {
                            selectedParent.phone ? (
                                <a href={`tel:${selectedParent.phone}`}>{selectedParent.phone}</a>
                            ) : 'N/A'
                        }</p>
                        <p><strong>Address:</strong> {selectedParent.address || 'N/A'}</p>
                        <p><strong>Grade:</strong> {
                            selectedParent.grade ? `Grade ${selectedParent.grade}` : 'N/A'
                        }</p>
                        <p><strong>Subjects:</strong> {
                            selectedParent.subjects && Array.isArray(selectedParent.subjects) 
                                ? selectedParent.subjects.map((subject, index) => (
                                    <span key={index}>
                                        {subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ')}
                                        {index < selectedParent.subjects.length - 1 ? ', ' : ''}
                                    </span>
                                ))
                                : (selectedParent.subjects || 'N/A')
                        }</p>
                        <p><strong>Preferred Teacher:</strong> {
                            selectedParent.preferredTeacher 
                                ? selectedParent.preferredTeacher.charAt(0).toUpperCase() + selectedParent.preferredTeacher.slice(1)
                                : 'N/A'
                        }</p>
                        <p><strong>Preferred Time:</strong> {
                            selectedParent.preferredTime ? (
                                {
                                    'morning': 'Morning (6 AM - 10 AM)',
                                    'afternoon': 'Afternoon (2 PM - 5 PM)',
                                    'evening': 'Evening (5 PM - 8 PM)'
                                }[selectedParent.preferredTime] || selectedParent.preferredTime
                            ) : 'N/A'
                        }</p>
                        <p><strong>Salary Offered:</strong> {selectedParent.salary || 'Negotiable'}</p>
                        <p><strong>Status:</strong> {
                            selectedParent.status ? (
                                <Tag color={
                                    selectedParent.status === 'new' ? 'default' :
                                    selectedParent.status === 'pending' ? 'processing' :
                                    selectedParent.status === 'done' ? 'success' : 'error'
                                }>
                                    {selectedParent.status === 'new' ? 'New Application' :
                                     selectedParent.status === 'pending' ? 'Vacancy Created' :
                                     selectedParent.status === 'done' ? 'Teacher Assigned' : 
                                     selectedParent.status === 'not_done' ? 'Failed' : 
                                     selectedParent.status.toUpperCase()}
                                </Tag>
                            ) : 'N/A'
                        }</p>
                        {selectedParent.submissionDate && (
                            <p><strong>Submission Date:</strong> {new Date(selectedParent.submissionDate).toLocaleString()}</p>
                        )}
                    </div>
                )}
            </Modal>

            {/* Add Applicant Modal */}
            <Modal
                title="Add New Applicant"
                open={addApplicantModalVisible}
                onCancel={() => {
                    setAddApplicantModalVisible(false);
                    addApplicantForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={addApplicantForm}
                    layout="vertical"
                    onFinish={handleAddApplicant}
                >
                    <Form.Item
                        name="fullName"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter applicant name' }]}
                    >
                        <Input placeholder="Enter applicant name" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[{ required: true, message: 'Please enter phone number' }]}
                    >
                        <Input 
                            placeholder="Enter phone number" 
                            addonBefore={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Add Applicant
                            </Button>
                            <Button onClick={() => {
                                setAddApplicantModalVisible(false);
                                addApplicantForm.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};



export default TeacherList;
