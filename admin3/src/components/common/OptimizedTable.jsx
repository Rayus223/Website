import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FixedSizeList as List } from 'react-window';
import { debounce } from '../../utils/performance';

/**
 * OptimizedTable component with virtualization for better performance
 * Use this instead of Ant Design Table for large datasets
 */
const OptimizedTable = ({
  dataSource,
  columns,
  loading = false,
  rowKey = 'id',
  pagination = true,
  onRowClick,
  searchable = false,
  defaultSearchField = '',
  virtualScroll = false,
  height = 500,
  ...restProps
}) => {
  // Local state
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState(defaultSearchField);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((value) => setSearchText(value), 300),
    []
  );

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!searchText) return dataSource;
    
    return dataSource.filter(record => {
      // If searchField is specified, only search in that field
      if (searchField) {
        const value = record[searchField];
        return value && String(value).toLowerCase().includes(searchText.toLowerCase());
      }
      
      // Otherwise search in all fields
      return Object.values(record).some(value => 
        value && String(value).toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [dataSource, searchText, searchField]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData.length]);

  // Calculate rows for current page
  const currentPageData = useMemo(() => {
    if (!pagination) return filteredData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize, pagination]);

  // Handle search input
  const handleSearch = (e) => {
    debouncedSearch(e.target.value);
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Search input component
  const renderSearchInput = () => {
    if (!searchable) return null;
    
    return (
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search..."
          onChange={handleSearch}
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          allowClear
        />
        {columns.length > 0 && (
          <select 
            onChange={(e) => setSearchField(e.target.value)}
            value={searchField}
            style={{ marginLeft: 8 }}
          >
            <option value="">All Fields</option>
            {columns
              .filter(col => col.dataIndex)
              .map(col => (
                <option key={col.dataIndex} value={col.dataIndex}>
                  {col.title}
                </option>
              ))}
          </select>
        )}
      </div>
    );
  };

  // Virtualized table implementation
  if (virtualScroll && dataSource.length > 100) {
    // Column headers
    const headerRow = (
      <div className="virtual-header-row">
        {columns.map((column) => (
          <div 
            key={column.key || column.dataIndex} 
            className="virtual-header-cell"
            style={{ 
              flex: column.width ? `0 0 ${column.width}px` : 1,
              fontWeight: 'bold',
              padding: '12px 8px',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            {column.title}
          </div>
        ))}
      </div>
    );

    // Row renderer
    const Row = ({ index, style }) => {
      const item = currentPageData[index];
      if (!item) return null;

      return (
        <div 
          style={{ 
            ...style, 
            display: 'flex',
            alignItems: 'center',
            cursor: onRowClick ? 'pointer' : 'default',
            borderBottom: '1px solid #f0f0f0'
          }}
          onClick={() => onRowClick && onRowClick(item)}
          className="virtual-row"
        >
          {columns.map((column) => (
            <div 
              key={column.key || column.dataIndex} 
              className="virtual-cell"
              style={{ 
                flex: column.width ? `0 0 ${column.width}px` : 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '8px'
              }}
            >
              {column.render 
                ? column.render(item[column.dataIndex], item, index)
                : item[column.dataIndex]}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div>
        {renderSearchInput()}
        {headerRow}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
        ) : (
          <List
            height={height}
            itemCount={currentPageData.length}
            itemSize={50}
            width="100%"
          >
            {Row}
          </List>
        )}
        {pagination && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span style={{ margin: '0 8px' }}>
              Page {currentPage} of {Math.ceil(filteredData.length / pageSize)}
            </span>
            <Button 
              disabled={currentPage === Math.ceil(filteredData.length / pageSize)} 
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Standard Ant Design table for smaller datasets
  return (
    <div>
      {renderSearchInput()}
      <Table
        dataSource={filteredData}
        columns={columns}
        loading={loading}
        rowKey={rowKey}
        pagination={
          pagination
            ? {
                current: currentPage,
                pageSize: pageSize,
                total: filteredData.length,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              }
            : false
        }
        onChange={handleTableChange}
        onRow={onRowClick ? (record) => ({
          onClick: () => onRowClick(record),
        }) : undefined}
        {...restProps}
      />
    </div>
  );
};

export default React.memo(OptimizedTable); 