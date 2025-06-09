import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Table, Tag, Button, Space, Modal, message, Tooltip, Tabs, Card, 
    Form, Input, Select, Row, Col, Statistic, Checkbox, Switch, Badge, Upload, Spin, DatePicker, Drawer, InputNumber, Popover // <-- Remove ReloadOutlined from here
} from 'antd';
import { 
    EyeOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined,
    PlusOutlined, BookOutlined, UserOutlined, DeleteOutlined,
    EditOutlined, StarFilled, StarOutlined, WhatsAppOutlined, DollarOutlined, RollbackOutlined,
    CheckCircleOutlined, CopyOutlined, ReloadOutlined // Add ReloadOutlined here
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
    const [pageSize, setPageSize] = useState(100);
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

    // Define columns for the budget table
    

    // Modify handler function to open the Teacher Details modal
    const handleViewBudgetDetails = (record) => {
        const teacher = teachers.find(t => t._id === record.teacherId);
        if (teacher) {
            // Call the existing function to show teacher details
            handleViewTeacher(teacher); 
        } else {
            message.error('Could not find teacher details.');
        }
    };

    // Replace with new function
    const fetchBudgetData = async () => {
        try {
            // Check for authentication token first
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('No authentication token found for budget data fetch');
                
                // Try to load from localStorage as a fallback
                const savedData = localStorage.getItem('budgetData');
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    setBudgetData(parsedData);
                    console.log('No token - loaded budget data from localStorage');
                    return;
                } else {
                    setBudgetData([]); // Set empty array as fallback
                    console.log('No token - setting empty budget data');
                    return;
                }
            }

            console.log('Fetching budget transactions with token:', token.substring(0, 15) + '...');
            const response = await apiService.getBudgetTransactions();
            
            if (response.success) {
                console.log('Budget transactions received:', response.data);
                
                // Set the budget data directly from the backend response
                setBudgetData(response.data);
                
                // Also save to localStorage for backup
                localStorage.setItem('budgetData', JSON.stringify(response.data));
            } else {
                console.error('Invalid response format or error:', response);
                
                if (response.message && response.message.includes('expired')) {
                    // Handle expired token
                    message.error('Your session has expired. Please log in again.');
                    
                    // Clear token after a delay to allow message to be seen
                    setTimeout(() => {
                        localStorage.removeItem('adminToken');
                        window.location.href = '/login';
                    }, 2000);
                    return;
                }
                
                message.error(response.message || 'Failed to fetch budget data');
                
                // Try to load from localStorage as a fallback
                const savedData = localStorage.getItem('budgetData');
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    setBudgetData(parsedData);
                    console.log('Loaded budget data from localStorage as fallback');
                } else {
                    setBudgetData([]); // Set empty array as fallback
                }
            }
        } catch (error) {
            console.error('Error fetching budget data:', error);
            
            // Check for authentication errors
            if (error.response && error.response.status === 401) {
                message.error('Authentication failed. Please log in again.');
                
                // Clear token after a delay
                setTimeout(() => {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            
            message.error('Failed to fetch budget data');
            
            // Try to load from localStorage as a fallback
            const savedData = localStorage.getItem('budgetData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setBudgetData(parsedData);
                console.log('Loaded budget data from localStorage as fallback');
            } else {
                setBudgetData([]); // Set empty array as fallback
            }
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
            console.log('Vacancies tab active, starting polling...');
            fetchData(true); // Fetch immediately when tab becomes active
            intervalId = setInterval(() => {
                console.log('Polling vacancies...');
                fetchData(false); // Poll without showing loading indicator
            }, 420000); // Poll every 7 minutes (increased from 15 seconds)
        }

        // Cleanup function: clear interval when tab changes or component unmounts
    return () => {
            if (intervalId) {
                console.log('Clearing polling interval.');
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

const fetchData = async (showLoading = true) => {
    try {
        if (showLoading) {
            setLoading(true);
        }

        // Check if we have cached data in localStorage and if it's still fresh
        const cachedData = localStorage.getItem('cachedTeachersAndVacancies');
        const cachedTimestamp = localStorage.getItem('cachedDataTimestamp');
        const now = new Date().getTime();
        
        // Define cache expiry time - 15 minutes (in milliseconds)
        const cacheExpiryTime = 15 * 60 * 1000;
        
        let teachersData = [];
        let vacanciesData = [];
        let shouldFetchFromBackend = true;
        
        // Check if we have valid cached data that's not expired
        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < cacheExpiryTime)) {
            console.log('Using cached data from localStorage');
            const parsedData = JSON.parse(cachedData);
            teachersData = parsedData.teachers || [];
            vacanciesData = parsedData.vacancies || [];
            shouldFetchFromBackend = false;
            
            // Update states with cached data
            setTeachers(teachersData);
            setVacancies(vacanciesData);
            
            // No need to fetch from backend if we're using cache
            if (!showLoading) {
                setLoading(false);
                return;
            }
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

        // Only fetch data from backend if needed
        if (shouldFetchFromBackend && activeTab === 'vacancies') {
            console.log('Fetching fresh data from backend');
            const [teachersResponse, vacanciesResponse] = await Promise.all([
                apiService.getAllTeachers(),
                apiService.getAllVacancies()
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
            setVacancies(vacanciesResponse);
            
            // Cache the new data in localStorage
            const dataToCache = {
                teachers: teachersToSet,
                vacancies: vacanciesResponse
            };
            localStorage.setItem('cachedTeachersAndVacancies', JSON.stringify(dataToCache));
            localStorage.setItem('cachedDataTimestamp', now.toString());
            console.log('Data cached to localStorage');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch data');
    } finally {
        setLoading(false);
    }
};

    // Data fetching
    useEffect(() => {
        console.log('Component mounted, fetching data...');
        fetchData();
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
            const hasAcceptedApplication = vacancy.applications?.some(app => app.status === 'accepted');
            
            // Format the applications data
            const applicants = vacancy.applications?.map(app => {
                const status = app.status || 'pending';
                return {
                    ...app.teacher, 
                    _id: app._id, 
                    teacherId: app.teacher?._id,
                    status: status,
                    appliedAt: app.appliedAt // Make sure this is available
                };
            }) || [];
            
            console.log('Formatted applicants for vacancy:', applicants.length);
            
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
                return 'green';
            case 'rejected':
                return 'red';
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
                // For PDFs - show in preview
                const previewUrl = cvUrl.replace('/raw/upload/', '/upload/');
                setSelectedCvUrl(previewUrl);
                setCvModalVisible(true);
            } else if (fileType === 'doc') {
                // For DOC/DOCX - use Google Docs Viewer
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
                                        return { ...app, status };
                                    }
                                    return app;
                                });
                                return { ...vacancy, applications: updatedApplications };
                            }
                            return vacancy;
                        });
                    });
                    
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
        return (
          <span style={{
            backgroundColor: isHighlighted ? '#ffd54f' : 'transparent',
            padding: isHighlighted ? '2px 4px' : '0',
            borderRadius: '4px'
          }}>
            {text}
          </span>
        );
      }
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
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
            )
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
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
            // If status is null, undefined, or an empty string, display as PENDING
            const displayStatus = status && status !== '' ? status : 'pending';
            
            return (
                <Tag color={getStatusColor(displayStatus)}>
                    {displayStatus.toUpperCase()}
                </Tag>
            );
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
        // Check if any teacher is already accepted for this vacancy
        const vacancy = selectedVacancy;
        const hasAcceptedApplication = vacancy?.applications?.some(app => app.status === 'accepted');
        
        // Ensure we have a valid status - default to 'pending' if not set
        const recordStatus = (record.status || 'pending').toLowerCase();

        // Don't show action buttons if already processed (accepted or rejected)
        if (recordStatus === 'accepted' || recordStatus === 'rejected') {
            return (
                <Space size="middle">
                    <Tooltip title="View CV">
                        <Button 
                            icon={<FilePdfOutlined />}
                            onClick={() => handleViewCV(record.cv)}
                        />
                    </Tooltip>
                    <Tag color={recordStatus === 'accepted' ? 'green' : 'red'}>
                        {recordStatus.toUpperCase()}
                    </Tag>
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
    // REMOVED Teacher column
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
        dataIndex: 'vacancyTitle',
        key: 'vacancyTitle',
    },
    
    {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => `Rs. ${amount}`, // Changed prefix to Rs.
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
        }
    },
    {
        title: 'Remaining',
        key: 'remaining',
        render: (_, record) => {
            if (record.status === 'partial' && record.remainingAmount) { // Use record.status and record.remainingAmount
                return `Rs. ${record.remainingAmount}`; // Changed prefix to Rs.
            }
            return '-';
        }
    },
    {
        title: 'Due Date',
        key: 'dueDate',
        render: (_, record) => {
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
        render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
        title: 'Actions', // ADD Actions column
        key: 'actions',
        render: (_, record) => {
            // Function to show confirmation modal
            const showConfirm = () => {
                Modal.confirm({
                    title: 'Confirm Mark as Paid',
                    content: 'Are you sure you want to mark this partial payment as fully paid? This action cannot be undone.',
                    okText: 'Yes, Mark as Paid',
                    okType: 'primary',
                    cancelText: 'No, Cancel',
                    onOk() {
                        handleMarkAsPaid(record._id); // Call the original handler on confirmation
                    },
                    onCancel() {
                        console.log('Mark as paid cancelled');
                    },
                });
            };

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
                                onClick={showConfirm} // Call the confirmation modal function
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
            render: (_, record) => (
                <Tag color={record.isActive ? 'green' : 'orange'}>
                    {record.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Tag>
            )
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
                    />
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
                </Space>
            )
        }
    ];

    

    // Function to get accepted teachers - Use useMemo for optimization
    const acceptedTeachersData = useMemo(() => {
        const acceptedTeachersWithVacancies = [];
        const processedTeachers = new Set(); // To track which teachers we've already processed
        
        console.log('Recalculating accepted teachers list...'); // Add log
        
        // Log all applications and their statuses
        // console.log('All applications across vacancies:', 
        //     vacancies.flatMap(v => v.applications?.map(app => ({
        //         vacancyId: v._id,
        //         applicationId: app._id,
        //         teacherId: app.teacher?._id,
        //         status: app.status || 'undefined'
        //     })) || [])
        // );
        
        // Iterate through each vacancy
        vacancies.forEach(vacancy => {
            // Find accepted applications in this vacancy
            vacancy.applications?.forEach(app => {
                // ONLY include if the application status is EXPLICITLY 'accepted' - strict equality check
                if (app.status === 'accepted' && app.teacher) {
                    const teacherVacancyKey = `${app.teacher._id}-${vacancy._id}`;
                    
                    // console.log(`Found accepted application: ${app.teacher.fullName} for vacancy ${vacancy.title}`);
                    
                    // Skip if we've already processed this teacher for this vacancy
                    if (processedTeachers.has(teacherVacancyKey)) {
                        return;
                    }
                    
                    // Find the full teacher data
                    const teacher = teachers.find(t => t._id === app.teacher._id);
                    if (teacher) {
                        // Create a new entry with both teacher and vacancy info
                        acceptedTeachersWithVacancies.push({
                            ...teacher,
                            uniqueKey: teacherVacancyKey,
                            vacancyId: vacancy._id,
                            vacancyTitle: vacancy.title,
                            applicationStatus: app.status,
                            isActive: app.isActive !== undefined ? app.isActive : teacher.isActive // Prioritize app.isActive if present
                        });
                        
                        // Mark this teacher-vacancy combination as processed
                        processedTeachers.add(teacherVacancyKey);
                    }
                }
            });
        });

        console.log(`Finished calculating accepted teachers. Count: ${acceptedTeachersWithVacancies.length}`);
        return acceptedTeachersWithVacancies;
    }, [teachers, vacancies]); // Dependencies: recalculate only if teachers or vacancies change

    // Add new function to handle teacher active status
    const handleTeacherActiveStatus = async (teacherId, isActive) => {
        try {
            setLoading(true);
            
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
        } finally {
            setLoading(false);
        }
    };

    // Add refund handling functions
    const handleRefundClick = (teacher, vacancy) => {
        try {
            // Find the application for this teacher and vacancy
            const foundVacancy = vacancies.find(v => v._id === vacancy._id);
            const foundApplication = foundVacancy?.applications?.find(
                app => app.teacher && app.teacher._id === teacher._id
            );

            if (!foundApplication) {
                message.error('Could not find application details');
                return;
            }

            console.log('Looking for payment record for:', {
                teacherId: teacher._id,
                vacancyId: vacancy._id
            });

            // Look for payment records with more flexible matching
            const paymentRecords = budgetData.filter(
                entry => entry.teacherId === teacher._id && 
                       entry.vacancyId === vacancy._id &&
                       entry.type === 'payment'
            );
            
            console.log('Found payment records:', paymentRecords);
            
            // If no payment records found, create a dummy payment record
            let originalPayment;
            if (paymentRecords.length === 0) {
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
                            teacherId: teacher._id,
                            teacherName: teacher.fullName,
                            vacancyId: vacancy._id,
                            vacancyTitle: vacancy.title,
                            amount: 0, // Unknown amount
                            date: new Date().toISOString(),
                            type: 'payment',
                            isAdminOverride: true
                        };
                        
                        setSelectedRefundTeacher({
                            teacher,
                            vacancy,
                            application: foundApplication,
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
                    teacher,
                    vacancy,
                    application: foundApplication,
                    originalPayment
                });
                setRefundFormVisible(true);
            }
        } catch (error) {
            console.error('Error preparing refund:', error);
            message.error('Failed to prepare refund: ' + error.message);
        }
    };

    const handleRefundSubmit = async (values) => {
        try {
            setLoading(true);
            
            if (!selectedRefundTeacher?.originalPayment) {
                throw new Error('Original payment record not found');
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
            if (foundApplication.status === 'refunded') {
                throw new Error('This application has already been refunded');
            }

            // Create refund entry
            const refundEntry = {
                teacherId: selectedRefundTeacher.teacher._id,
                teacherName: selectedRefundTeacher.teacher.fullName,
                vacancyId: selectedRefundTeacher.vacancy._id,
                vacancyTitle: selectedRefundTeacher.vacancy.title,
                amount: parseFloat(values.refundAmount),
                date: new Date().toISOString(),
                status: 'refunded',
                type: 'refund',
                reason: values.reason,
                isAdminOverride: selectedRefundTeacher.originalPayment.isAdminOverride
            };
            
            // Only add originalPaymentId if it's not an admin override
            if (!selectedRefundTeacher.originalPayment.isAdminOverride) {
                refundEntry.originalPaymentId = selectedRefundTeacher.originalPayment._id || 
                                                selectedRefundTeacher.originalPayment.id;
            }

            console.log('Creating refund entry:', refundEntry);

            // Save refund to backend
            const response = await apiService.saveBudgetTransaction(refundEntry);

            if (!response.success) {
                throw new Error('Failed to save refund record: ' + (response.message || 'Unknown error'));
            }

            // Update application status
            const appId = foundApplication._id;
            if (!appId) {
                console.warn('Application ID not found, skipping status update');
            } else {
                const statusResponse = await apiService.updateApplicationStatus(
                    appId,
                    'refunded'
                );

                if (!statusResponse.success) {
                    console.warn('Failed to update application status, but refund was processed');
                }
            }

            // Update local states
            setVacancies(prev => 
                prev.map(v => 
                    v._id === selectedRefundTeacher.vacancy._id 
                        ? {
                            ...v,
                            applications: v.applications.map(app =>
                                (app._id === foundApplication._id) || 
                                (app.teacher?._id === selectedRefundTeacher.teacher._id)
                                    ? { ...app, status: 'refunded' }
                                    : app
                            )
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

        } catch (error) {
            console.error('Error processing refund:', error);
            message.error(error.message || 'Failed to process refund');
        } finally {
            setLoading(false);
        }
    };

    // Update BudgetSection component
    const BudgetSection = React.memo(() => {
        const handleTabChange = useCallback((newTab) => {
            setBudgetActiveTab(newTab);
        }, []);

        // Memoize filtered data
        const filteredData = useMemo(() => {
            const data = budgetActiveTab === 'all' 
                ? budgetData 
                : budgetData.filter(entry => entry.type === budgetActiveTab);
            
            return data.sort((a, b) => new Date(b.date) - new Date(a.date));
        }, [budgetData, budgetActiveTab]);

        // Memoize calculations
        const { totalPayments, totalRefunds, netAmount, pendingAmount } = useMemo(() => {
            const payments = budgetData
                .filter(entry => entry.type === 'payment')
                .reduce((sum, entry) => sum + entry.amount, 0);
                
            const refunds = budgetData
                .filter(entry => entry.type === 'refund')
                .reduce((sum, entry) => sum + entry.amount, 0);
                
            const pending = budgetData
                .filter(entry => entry.type === 'payment' && entry.status === 'partial')
                .reduce((sum, entry) => sum + (entry.remainingAmount || 0), 0); // Use entry.remainingAmount

            return {
                totalPayments: payments,
                totalRefunds: refunds,
                netAmount: payments - refunds,
                pendingAmount: pending
            };
        }, [budgetData]);

        return (
            <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic 
                                title="Total Collections" 
                                value={`Rs. ${totalPayments.toLocaleString()}`}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic 
                                title="Total Refunds" 
                                value={`Rs. ${totalRefunds.toLocaleString()}`}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic 
                                title="Pending Collections" 
                                value={`Rs. ${pendingAmount.toLocaleString()}`}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic 
                                title="Net Amount" 
                                value={`Rs. ${netAmount.toLocaleString()}`}
                                valueStyle={{ color: netAmount >= 0 ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Tabs 
                    activeKey={budgetActiveTab} 
                    onChange={handleTabChange}
                    style={{ marginBottom: 16 }}
                >
                    <TabPane tab="All Transactions" key="all" />
                    <TabPane tab="Payments" key="payment" />
                    <TabPane tab="Refunds" key="refund" />
                </Tabs>

                <Table 
                    columns={budgetColumns}
                    dataSource={filteredData}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                    }}
                />
            </div>
        );
    }, (prevProps, nextProps) => true);

    // Add this after the fetchData function
    const clearCache = () => {
        localStorage.removeItem('cachedTeachersAndVacancies');
        localStorage.removeItem('cachedDataTimestamp');
        message.success('Cache cleared. Fetching fresh data...');
        fetchData(true);
    };

    // In the items array, update the vacancies tab's children to include a refresh button
    const items = [
        {
            key: 'vacancies',
            label: <span><BookOutlined />Vacancies</span>,
            children: (
                <div className="vacancy-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => toggleModal('addVacancy')}
                                className="action-button"
                                size="large"
                                style={{ marginRight: 8 }}
                            >
                                Add Vacancy
                            </Button>
                            <Button
                                onClick={clearCache}
                                icon={<ReloadOutlined />}
                                size="large"
                            >
                                Refresh Data
                            </Button>
                        </div>
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
                setVacancies(prevVacancies => {
                    return prevVacancies.map(vacancy => {
                        if (vacancy.applications) {
                            const updatedApplications = vacancy.applications.map(app => {
                                if (app._id === applicationId) {
                                    return { ...app, status };
                                }
                                return app;
                            });
                            return { ...vacancy, applications: updatedApplications };
                        }
                        return vacancy;
                    });
                });

                // Store the status update in localStorage (optional, might be redundant if backend is source of truth)
                // const updates = JSON.parse(localStorage.getItem('statusUpdates') || '[]');
                // updates.push({ applicationId, status, timestamp: new Date().toISOString() });
                // localStorage.setItem('statusUpdates', JSON.stringify(updates));

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
Dear Sir Tuition - Vacancy
---------------------------
Title: ${vacancy.title}
Subject: ${vacancy.subject}
Class: ${vacancy.class}
Time: ${vacancy.time}
Location: ${vacancy.location}
Gender: ${vacancy.gender === 'any' ? 'Any' : vacancy.gender.charAt(0).toUpperCase() + vacancy.gender.slice(1)}
Salary: ${vacancy.salary}
Description: ${vacancy.description}

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
            const baseUrl = process.env.REACT_APP_API_URL || 'https://api.dearsirhometuition.com';
            
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
Dear Sir Tuition - Parent Details (Vacancy: ${vacancy.title})
-------------------------------------------------------------
Name: ${parent.parentName || 'N/A'}
Phone: ${parent.phone || 'N/A'}
Address: ${parent.address || 'N/A'}
Grade: ${parent.grade ? `Grade ${parent.grade}` : 'N/A'}
Subjects: ${parent.subjects ? (Array.isArray(parent.subjects) ? parent.subjects.join(', ') : parent.subjects) : 'N/A'}
Preferred Teacher: ${parent.preferredTeacher ? parent.preferredTeacher.charAt(0).toUpperCase() + parent.preferredTeacher.slice(1) : 'N/A'}
Preferred Time: ${parent.preferredTime || 'N/A'}
Salary Offered: ${parent.salary || 'Negotiable'}
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
Dear Sir Tuition - Parent Details (Vacancy: ${vacancy.title})
-------------------------------------------------------------
Name: ${parent.parentName || 'N/A'}
Phone: ${parent.phone || 'N/A'}
Address: ${parent.address || 'N/A'}
Grade: ${parent.grade ? `Grade ${parent.grade}` : 'N/A'}
Subjects: ${parent.subjects ? (Array.isArray(parent.subjects) ? parent.subjects.join(', ') : parent.subjects) : 'N/A'}
Preferred Teacher: ${parent.preferredTeacher ? parent.preferredTeacher.charAt(0).toUpperCase() + parent.preferredTeacher.slice(1) : 'N/A'}
Preferred Time: ${parent.preferredTime || 'N/A'}
Salary Offered: ${parent.salary || 'Negotiable'}
Status: ${parent.status ? parent.status.toUpperCase() : 'N/A'}
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
                
                {selectedVacancy?.status === 'closed' && !selectedVacancy?.hasAcceptedApplication && (
                    <div style={{ marginBottom: 16, backgroundColor: '#fff7e6', padding: 10, border: '1px solid #ffd591', borderRadius: 4 }}>
                        <strong>Note:</strong> This vacancy is currently closed. To accept applications, please reopen it.
                    </div>
                )}
                
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
                                                    if (latestBudgetEntry) {
                                                        if (latestBudgetEntry.status === 'paid') {
                                                            paymentStatusTag = <Tag color="green">Paid</Tag>;
                                                        } else if (latestBudgetEntry.status === 'partial') {
                                                            paymentStatusTag = <Tag color="orange">Partial</Tag>;
                                                        } else if (latestBudgetEntry.status === 'refunded') {
                                                            paymentStatusTag = <Tag color="red">Refunded</Tag>;
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
                        rules={[
                            { required: true, message: 'Please enter the amount paid' },
                            { 
                                validator: async (_, value) => {
                                    if (!value || parseFloat(value) <= 0) {
                                        throw new Error('Amount must be greater than 0');
                                    }
                                }
                            }
                        ]}
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
                        rules={[
                            { required: true, message: 'Please enter the remaining amount' },
                            { 
                                validator: async (_, value) => {
                                    if (!value || parseFloat(value) <= 0) {
                                        throw new Error('Amount must be greater than 0');
                                    }
                                }
                            }
                        ]}
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
Dear Sir Tuition - Parent Details (Vacancy: ${selectedParent.vacancyTitle || ''})
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
        </div>
    );
};



export default TeacherList;
