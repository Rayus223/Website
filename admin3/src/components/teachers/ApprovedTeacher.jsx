import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Tooltip, message, Modal, Input, Slider, Card, Row, Col } from 'antd';
import { EyeOutlined, FilePdfOutlined, DownloadOutlined, EnvironmentOutlined, WhatsAppOutlined } from '@ant-design/icons';
import apiService from '../../services/api';
import { useRef } from 'react';

// Define getStatusColor locally if not imported
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'orange';
    case 'accepted': return 'success'; // Use 'success' for green
    case 'rejected': return 'error';   // Use 'error' for red
    case 'refunded': return 'red'; // Add refunded status
    default: return 'default';      // Default grey
  }
};

const ApprovedTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [cvModalVisible, setCvModalVisible] = useState(false);
  const [selectedCvUrl, setSelectedCvUrl] = useState(null);
  const [locationFilterVisible, setLocationFilterVisible] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [filterApplied, setFilterApplied] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [pageSize, setPageSize] = useState(1000);
  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef(null);

  // Add state for vacancies and budget data
  const [vacancies, setVacancies] = useState([]);
  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    // Fetch only approved teachers initially, without location filter
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch approved teachers *without* location filter
        const teachersRes = await apiService.getTeachersByStatus('approved'); 
        // Fetch other necessary data (vacancies, budget)
        const [vacanciesRes, budgetRes] = await Promise.all([
          apiService.getAllVacancies(),
          apiService.getBudgetTransactions()
        ]);

        if (teachersRes && teachersRes.data) {
          console.log('ApprovedTeacher - Initial fetch, setting teachers state:', teachersRes.data);
          setTeachers(teachersRes.data);
          setFilteredTeachers(teachersRes.data); // Initially show all approved
        } else {
          console.warn('ApprovedTeacher - No teacher data received initially');
          setTeachers([]);
          setFilteredTeachers([]);
        }
        if (vacanciesRes) { // Assuming vacanciesRes directly contains the array
          setVacancies(vacanciesRes);
        } else {
          setVacancies([]);
        }
        if (budgetRes && budgetRes.success && budgetRes.data) {
          setBudgetData(budgetRes.data);
        } else {
          setBudgetData([]);
        }

      } catch (error) {
         console.error('Error fetching initial data:', error);
         message.error('Failed to fetch required data');
         setTeachers([]);
         setFilteredTeachers([]); // Reset filtered list on error too
         setVacancies([]);
         setBudgetData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Add Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    if (!document.getElementById('leaflet-js') && !window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.async = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setMapLoaded(true);
    }

    // Add Leaflet Geocoder for search
    if (!document.getElementById('leaflet-geocoder-css') && document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-geocoder-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-geocoder-js') && !window.L?.Control?.Geocoder) {
      const script = document.createElement('script');
      script.id = 'leaflet-geocoder-js';
      script.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup if needed
      const leafletCss = document.getElementById('leaflet-css');
      const leafletJs = document.getElementById('leaflet-js');
      const geocoderCss = document.getElementById('leaflet-geocoder-css');
      const geocoderJs = document.getElementById('leaflet-geocoder-js');
      
      if (leafletCss) document.head.removeChild(leafletCss);
      if (leafletJs) document.head.removeChild(leafletJs);
      if (geocoderCss) document.head.removeChild(geocoderCss);
      if (geocoderJs) document.head.removeChild(geocoderJs);
    };
  }, []);

  useEffect(() => {
    // Initialize map when modal becomes visible and leaflet is loaded
    if (locationFilterVisible && mapLoaded && !mapRef.current) {
      setTimeout(() => {
        initializeMap();
      }, 300); 
    }
  }, [locationFilterVisible, mapLoaded]);

  const initializeMap = () => {
    // Default center (Delhi, India)
    const defaultCenter = [28.6139, 77.2090];
    
    // Initialize map
    if (!document.getElementById('map-container')) {
      console.error("Map container not found");
      return;
    }

    // Clear any existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = window.L.map('map-container').setView(defaultCenter, 12);
    
    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    mapRef.current = map;

    // Create a marker that can be dragged
    const marker = window.L.marker(defaultCenter, {
      draggable: true,
      title: 'Set location'
    }).addTo(map);
    
    markerRef.current = marker;

    // Create a circle to show the search radius
    const circle = window.L.circle(defaultCenter, {
      radius: searchRadius * 1000, // Convert km to meters
      fillColor: '#1890ff',
      fillOpacity: 0.2,
      stroke: true,
      color: '#1890ff',
      weight: 2
    }).addTo(map);
    
    circleRef.current = circle;

    // Add event listener for when marker is dragged
    marker.on('dragend', function() {
      const position = marker.getLatLng();
      setSelectedLocation({
        lat: position.lat,
        lng: position.lng
      });
      circle.setLatLng(position);
      
      // Get address from coordinates for display purposes
      if (window.L.Control.Geocoder) {
        const geocoder = window.L.Control.Geocoder.nominatim();
        geocoder.reverse(position, map.options.crs.scale(map.getZoom()), results => {
          if (results && results.length > 0) {
            setSearchAddress(results[0].name);
          }
        });
      }
    });

    // Add geocoder control for search
    if (window.L.Control.Geocoder) {
      const geocoder = window.L.Control.geocoder({
        defaultMarkGeocode: false
      }).addTo(map);
      
      geocoder.on('markgeocode', function(e) {
        const newPosition = e.geocode.center;
        
        map.setView(newPosition, 13);
        marker.setLatLng(newPosition);
        circle.setLatLng(newPosition);
        
        setSelectedLocation({
          lat: newPosition.lat,
          lng: newPosition.lng
        });
        setSearchAddress(e.geocode.name);
      });
    }

    // Update map size after modal is fully visible
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  };

  const updateSearchRadius = (value) => {
    setSearchRadius(value);
    if (circleRef.current) {
      circleRef.current.setRadius(value * 1000); // Convert km to meters
    }
  };

  const handleSearchAddressChange = (e) => {
    setSearchAddress(e.target.value);
  };

  const handleSearchAddressSubmit = () => {
    if (!searchAddress || !window.L?.Control?.Geocoder) return;
    
    const geocoder = window.L.Control.Geocoder.nominatim();
    geocoder.geocode(searchAddress, results => {
      if (results && results.length > 0) {
        const result = results[0];
        const newPosition = result.center;
        
        if (mapRef.current && markerRef.current && circleRef.current) {
          mapRef.current.setView(newPosition, 13);
          markerRef.current.setLatLng(newPosition);
          circleRef.current.setLatLng(newPosition);
          
          setSelectedLocation({
            lat: newPosition.lat,
            lng: newPosition.lng
          });
        }
      } else {
        message.warning('Location not found. Please try a different search term.');
      }
    });
  };

  const applyLocationFilter = async () => { // Make async
    if (!selectedLocation) {
      message.warning('Please select a location first');
      return;
    }

    setLoading(true);
    setFilterApplied(true); // Indicate filter is active
    
    try {
      // Call backend API with location parameters
      const locationParams = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        radiusKm: searchRadius
      };
      const filteredResults = await apiService.getTeachersByStatus('approved', locationParams);
      
      if (filteredResults && filteredResults.success && filteredResults.data) {
        console.log('Filtered teachers from backend:', filteredResults.data);
        // Directly set the filtered teachers state with the backend response
        // Backend using $nearSphere should already sort by distance
        setFilteredTeachers(filteredResults.data);
        message.success(`${filteredResults.data.length} teachers found within ${searchRadius}km.`);
      } else {
        console.warn('Backend filter returned no data or error', filteredResults);
        setFilteredTeachers([]); // Clear list if no results or error
        message.info('No teachers found within the specified radius.');
      }
      
    } catch (error) {
      console.error('Error applying location filter via API:', error);
      message.error('Failed to apply location filter.');
      setFilteredTeachers([]); // Clear on error
    } finally {
      setLocationFilterVisible(false); // Close modal
      setLoading(false);
    }
  };

  const clearLocationFilter = () => {
    setFilterApplied(false);
    // Reset filtered list to show all approved teachers again
    setFilteredTeachers(teachers); 
    setSelectedLocation(null);
    setSearchAddress('');
    setCurrentPage(1); // Reset to first page
  };

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setViewModalVisible(true);
  };

  // Handle CV preview and download
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

  const handleTableChange = (pagination, filters, sorter) => {
    console.log('Table change:', pagination);
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: (a, b) => a.fullName.localeCompare(b.fullName)
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone, record) => {
        if (typeof phone !== 'string' || !phone) {
          console.log('ApprovedTeacher - Phone missing or invalid for teacher:', record.fullName, 'Value received:', phone);
        }
        
        if (typeof phone !== 'string' || !phone) {
            return 'N/A';
        }
        const whatsappLink = `https://wa.me/${phone.replace(/\D/g, '')}`;
        return (
            <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                    color: '#25D366',
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
      render: (_, record) => {
        const address = record.address;
        if (!address) return 'N/A';
        
        const parts = address.split(',');
        const shortAddress = parts.slice(0, 2)
            .map(part => part.trim())
            .join(', ');
        
        return shortAddress;
      }
    },
    ...(filterApplied ? [
      {
        title: 'Distance (Approx)',
        key: 'distance',
        render: (_, record) => record.distance ? `${record.distance.toFixed(1)} km` : 'N/A',
      }
    ] : []),
    {
      title: 'Class',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade) => grade || 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'N/A'} 
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
        </Space>
      )
    }
  ];

  return (
    <div className="approved-teachers">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>Approved Teachers</h2>
        <div>
          {filterApplied ? (
            <Space>
              <span style={{ color: '#1890ff' }}>
                <EnvironmentOutlined /> Showing teachers within {searchRadius} km of selected location
              </span>
              <Button type="primary" onClick={clearLocationFilter}>
                Clear Filter
              </Button>
            </Space>
          ) : (
            <Button 
              type="primary" 
              icon={<EnvironmentOutlined />}
              onClick={() => setLocationFilterVisible(true)}
            >
              Filter by Location
            </Button>
          )}
        </div>
      </div>

      <Table 
        ref={tableRef}
        columns={columns}
        dataSource={filteredTeachers}
        loading={loading}
        rowKey="_id"
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          pageSizeOptions: ['10', '20', '50', '100', '1000'],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          position: ['bottomRight']
        }}
      />

      {/* Teacher Details Modal */}
      <Modal
        title="Teacher Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTeacher && (
          <div className="teacher-details">
            <h2>{selectedTeacher.fullName}</h2>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="detail-row">
                  <strong>Email:</strong> {selectedTeacher.email}
                </div>
                <div className="detail-row">
                  <strong>Phone:</strong> {selectedTeacher.phone || 'N/A'} 
                </div>
                <div className="detail-row">
                  <strong>Location:</strong> {selectedTeacher.address || 'N/A'}
                </div>
                <div className="detail-row"><strong>Class:</strong> 
                 {selectedTeacher.class || 'N/A'}
                </div>
                <div className="detail-row"><strong>Subjects:</strong> 
                 {selectedTeacher.subjects?.map(subject => (
                   <Tag key={subject} color="blue">{subject}</Tag>
                 )) || 'N/A'}
                </div>
                <div className="detail-row"><strong>CV:</strong> 
                  {selectedTeacher.cv ? (
                    <Button icon={<FilePdfOutlined />} onClick={() => handleViewCV(selectedTeacher.cv)}>View CV</Button>
                  ) : (
                    'Not Available'
                  )}
                </div>
              </Col>

              <Col span={12}>
                <div className="detail-row">
                  <strong>Applied Vacancies & Status:</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '5px', listStyle: 'none' }}>
                    {(() => {
                      const appliedToList = vacancies
                        .filter(vac => vac.applications?.some(app => app.teacher?._id === selectedTeacher._id))
                        .map(vac => {
                          const application = vac.applications.find(app => app.teacher?._id === selectedTeacher._id);
                          if (!application) return null;

                          const relevantBudgetEntries = budgetData
                            .filter(entry => entry.teacherId === selectedTeacher._id && entry.vacancyId === vac._id)
                            .sort((a, b) => new Date(b.date) - new Date(a.date));
                            
                          const latestBudgetEntry = relevantBudgetEntries[0];
                          
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
                            paymentStatusTag = <Tag color="blue">Payment Pending</Tag>;
                          }

                          return (
                            <li key={vac._id} style={{ marginBottom: '8px' }}>
                              {vac.title || 'Untitled Vacancy'} <br />
                              <Tag color={getStatusColor(application.status || 'pending')} style={{ marginRight: '5px' }}>
                                {(application.status || 'pending').toUpperCase()}
                              </Tag>
                              {(application.status === 'accepted' || latestBudgetEntry?.status === 'refunded') && paymentStatusTag}
                            </li>
                          );
                        })
                        .filter(Boolean);
                      
                      if (appliedToList.length === 0) {
                        return <li>No applications found for this teacher.</li>;
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

      {/* CV Preview Modal */}
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

      {/* Location Filter Modal */}
      <Modal
        title="Filter Teachers by Location"
        open={locationFilterVisible}
        onCancel={() => setLocationFilterVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setLocationFilterVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="apply" 
            type="primary" 
            onClick={applyLocationFilter}
          >
            Apply Filter
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space.Compact style={{ width: '100%', marginBottom: '16px' }}>
            <Input
              placeholder="Search for a location"
              value={searchAddress}
              onChange={handleSearchAddressChange}
              onPressEnter={handleSearchAddressSubmit}
            />
            <Button type="primary" onClick={handleSearchAddressSubmit}>Search</Button>
          </Space.Compact>
          <Card title="Search Radius" bordered={false}>
            <Slider
              min={0.5}
              max={20}
              step={0.5}
              value={searchRadius}
              onChange={updateSearchRadius}
              marks={{
                0.5: '0.5 km',
                5: '5 km',
                10: '10 km',
                20: '20 km'
              }}
            />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              {searchRadius} km
            </div>
          </Card>
        </div>
        <div
          id="map-container"
          style={{
            height: '400px',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #d9d9d9'
          }}
        ></div>
        <div style={{ marginTop: '16px', color: '#666' }}>
          <p>
            <strong>Instructions:</strong> Search for a location or drag the pin on the map to set your reference point. 
            Adjust the search radius using the slider above. Click "Apply Filter" to find teachers within the specified distance.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ApprovedTeachers;
