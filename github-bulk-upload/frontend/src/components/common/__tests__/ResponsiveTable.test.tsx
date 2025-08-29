import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions } from '../../../test/utils';
import ResponsiveTable from '../ResponsiveTable';

describe('ResponsiveTable', () => {
  const mockColumns = [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      fixed: 'left' as const
    },
    {
      key: 'name',
      title: '名称',
      dataIndex: 'name',
      width: 200,
      sortable: true,
      searchable: true
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: string) => (
        <span className={`status-${value.toLowerCase()}`}>
          {value === 'active' ? '活跃' : '非活跃'}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <div>
          <button onClick={() => console.log('edit', record.id)}>编辑</button>
          <button onClick={() => console.log('delete', record.id)}>删除</button>
        </div>
      )
    }
  ];

  const mockData = [
    {
      id: '1',
      name: '测试项目1',
      status: 'active',
      createdAt: '2023-12-01T10:00:00Z'
    },
    {
      id: '2',
      name: '测试项目2',
      status: 'inactive',
      createdAt: '2023-12-02T11:00:00Z'
    },
    {
      id: '3',
      name: '测试项目3',
      status: 'active',
      createdAt: '2023-12-03T12:00:00Z'
    }
  ];

  const defaultProps = {
    columns: mockColumns,
    data: mockData,
    loading: false,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 3,
      showSizeChanger: true,
      showQuickJumper: true
    }
  };

  describe('Rendering', () => {
    it('renders table with data correctly', () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      // 检查表头
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('名称')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('创建时间')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
      
      // 检查数据行
      expect(screen.getByText('测试项目1')).toBeInTheDocument();
      expect(screen.getByText('测试项目2')).toBeInTheDocument();
      expect(screen.getByText('测试项目3')).toBeInTheDocument();
      
      // 检查状态渲染
      expect(screen.getByText('活跃')).toBeInTheDocument();
      expect(screen.getByText('非活跃')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<ResponsiveTable {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('table-loading')).toBeInTheDocument();
      expect(screen.getByText(/加载中/i)).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(<ResponsiveTable {...defaultProps} data={[]} />);
      
      expect(screen.getByTestId('table-empty')).toBeInTheDocument();
      expect(screen.getByText(/暂无数据/i)).toBeInTheDocument();
    });

    it('renders custom empty state', () => {
      const customEmpty = <div data-testid="custom-empty">自定义空状态</div>;
      render(<ResponsiveTable {...defaultProps} data={[]} emptyText={customEmpty} />);
      
      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('自定义空状态')).toBeInTheDocument();
    });

    it('applies custom row class names', () => {
      const rowClassName = (record: any, index: number) => 
        record.status === 'active' ? 'active-row' : 'inactive-row';
      
      render(<ResponsiveTable {...defaultProps} rowClassName={rowClassName} />);
      
      const rows = screen.getAllByRole('row');
      // 跳过表头行
      expect(rows[1]).toHaveClass('active-row');
      expect(rows[2]).toHaveClass('inactive-row');
      expect(rows[3]).toHaveClass('active-row');
    });
  });

  describe('Sorting', () => {
    it('shows sortable column indicators', () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      const nameHeader = screen.getByText('名称').closest('th');
      const createdAtHeader = screen.getByText('创建时间').closest('th');
      
      expect(nameHeader).toHaveClass('sortable');
      expect(createdAtHeader).toHaveClass('sortable');
      
      expect(nameHeader?.querySelector('.sort-icon')).toBeInTheDocument();
      expect(createdAtHeader?.querySelector('.sort-icon')).toBeInTheDocument();
    });

    it('handles column sorting', async () => {
      const onSortChange = jest.fn();
      render(<ResponsiveTable {...defaultProps} onSortChange={onSortChange} />);
      
      const nameHeader = screen.getByText('名称');
      await userInteraction.clickButton(nameHeader);
      
      expect(onSortChange).toHaveBeenCalledWith({
        field: 'name',
        order: 'asc'
      });
      
      // 再次点击切换排序顺序
      await userInteraction.clickButton(nameHeader);
      
      expect(onSortChange).toHaveBeenCalledWith({
        field: 'name',
        order: 'desc'
      });
    });

    it('shows current sort state', () => {
      render(
        <ResponsiveTable 
          {...defaultProps} 
          sortConfig={{ field: 'name', order: 'asc' }}
        />
      );
      
      const nameHeader = screen.getByText('名称').closest('th');
      expect(nameHeader).toHaveClass('sorted-asc');
      expect(nameHeader?.querySelector('.sort-icon-asc')).toBeInTheDocument();
    });

    it('clears sort when clicking sorted column third time', async () => {
      const onSortChange = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          onSortChange={onSortChange}
          sortConfig={{ field: 'name', order: 'desc' }}
        />
      );
      
      const nameHeader = screen.getByText('名称');
      await userInteraction.clickButton(nameHeader);
      
      expect(onSortChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Selection', () => {
    it('shows selection checkboxes when selectable', () => {
      render(<ResponsiveTable {...defaultProps} rowSelection={{}} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 1 header + 3 rows
      
      const headerCheckbox = checkboxes[0];
      expect(headerCheckbox).toHaveAttribute('aria-label', '全选');
    });

    it('handles single row selection', async () => {
      const onSelectionChange = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          rowSelection={{ onSelectionChange }}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await userInteraction.clickButton(checkboxes[1]); // 第一行
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1'], [mockData[0]]);
    });

    it('handles select all', async () => {
      const onSelectionChange = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          rowSelection={{ onSelectionChange }}
        />
      );
      
      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      await userInteraction.clickButton(headerCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(
        ['1', '2', '3'],
        mockData
      );
    });

    it('shows indeterminate state for partial selection', () => {
      render(
        <ResponsiveTable 
          {...defaultProps} 
          rowSelection={{ selectedRowKeys: ['1'] }}
        />
      );
      
      const headerCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
      expect(headerCheckbox.indeterminate).toBe(true);
    });

    it('disables selection for specific rows', () => {
      const getCheckboxProps = (record: any) => ({
        disabled: record.status === 'inactive'
      });
      
      render(
        <ResponsiveTable 
          {...defaultProps} 
          rowSelection={{ getCheckboxProps }}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[2]).toBeDisabled(); // 第二行 (inactive)
      expect(checkboxes[1]).not.toBeDisabled(); // 第一行 (active)
      expect(checkboxes[3]).not.toBeDisabled(); // 第三行 (active)
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      expect(screen.getByRole('navigation', { name: /分页/i })).toBeInTheDocument();
      expect(screen.getByText(/共 3 条/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/每页显示/i)).toBeInTheDocument();
    });

    it('handles page change', async () => {
      const onPaginationChange = jest.fn();
      const paginationProps = {
        ...defaultProps.pagination,
        total: 25,
        current: 1
      };
      
      render(
        <ResponsiveTable 
          {...defaultProps} 
          pagination={paginationProps}
          onPaginationChange={onPaginationChange}
        />
      );
      
      const nextButton = screen.getByLabelText(/下一页/i);
      await userInteraction.clickButton(nextButton);
      
      expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
    });

    it('handles page size change', async () => {
      const onPaginationChange = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          onPaginationChange={onPaginationChange}
        />
      );
      
      await userInteraction.selectOption(/每页显示/i, '20');
      
      expect(onPaginationChange).toHaveBeenCalledWith(1, 20);
    });

    it('hides pagination when disabled', () => {
      render(<ResponsiveTable {...defaultProps} pagination={false} />);
      
      expect(screen.queryByRole('navigation', { name: /分页/i })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('switches to card layout on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<ResponsiveTable {...defaultProps} />);
      
      expect(screen.getByTestId('table-card-layout')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows horizontal scroll on tablet', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      
      render(<ResponsiveTable {...defaultProps} />);
      
      const tableContainer = screen.getByTestId('table-container');
      expect(tableContainer).toHaveClass('horizontal-scroll');
    });

    it('collapses columns based on priority', () => {
      const columnsWithPriority = mockColumns.map((col, index) => ({
        ...col,
        priority: index + 1
      }));
      
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      
      render(
        <ResponsiveTable 
          {...defaultProps} 
          columns={columnsWithPriority}
        />
      );
      
      // 低优先级列应该被隐藏
      expect(screen.queryByText('创建时间')).not.toBeInTheDocument();
      expect(screen.getByText('名称')).toBeInTheDocument(); // 高优先级列保留
    });

    it('shows expand button for collapsed content', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<ResponsiveTable {...defaultProps} />);
      
      const expandButtons = screen.getAllByLabelText(/展开详情/i);
      expect(expandButtons).toHaveLength(3);
      
      await userInteraction.clickButton(expandButtons[0]);
      
      // 展开后应该显示所有字段
      expect(screen.getByText('创建时间')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('shows search input for searchable columns', () => {
      render(<ResponsiveTable {...defaultProps} showSearch />);
      
      expect(screen.getByLabelText(/搜索名称/i)).toBeInTheDocument();
    });

    it('handles search input', async () => {
      const onSearch = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          showSearch
          onSearch={onSearch}
        />
      );
      
      const searchInput = screen.getByLabelText(/搜索名称/i);
      await userInteraction.fillInput(searchInput, '测试项目1');
      
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('name', '测试项目1');
      });
    });

    it('shows column filter dropdowns', async () => {
      const statusColumn = {
        ...mockColumns[2],
        filters: [
          { text: '活跃', value: 'active' },
          { text: '非活跃', value: 'inactive' }
        ]
      };
      
      const columnsWithFilter = [...mockColumns];
      columnsWithFilter[2] = statusColumn;
      
      render(<ResponsiveTable {...defaultProps} columns={columnsWithFilter} />);
      
      const filterButton = screen.getByLabelText(/筛选状态/i);
      await userInteraction.clickButton(filterButton);
      
      expect(screen.getByText('活跃')).toBeInTheDocument();
      expect(screen.getByText('非活跃')).toBeInTheDocument();
    });

    it('applies column filters', async () => {
      const onFilterChange = jest.fn();
      const statusColumn = {
        ...mockColumns[2],
        filters: [
          { text: '活跃', value: 'active' },
          { text: '非活跃', value: 'inactive' }
        ]
      };
      
      const columnsWithFilter = [...mockColumns];
      columnsWithFilter[2] = statusColumn;
      
      render(
        <ResponsiveTable 
          {...defaultProps} 
          columns={columnsWithFilter}
          onFilterChange={onFilterChange}
        />
      );
      
      const filterButton = screen.getByLabelText(/筛选状态/i);
      await userInteraction.clickButton(filterButton);
      
      const activeOption = screen.getByText('活跃');
      await userInteraction.clickButton(activeOption);
      
      const confirmButton = screen.getByRole('button', { name: /确定/i });
      await userInteraction.clickButton(confirmButton);
      
      expect(onFilterChange).toHaveBeenCalledWith({
        status: ['active']
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', '数据表格');
      
      const columnHeaders = screen.getAllByRole('columnheader');
      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('supports keyboard navigation', () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      const table = screen.getByRole('table');
      table.focus();
      expect(document.activeElement).toBe(table);
      
      // 使用方向键导航
      fireEvent.keyDown(table, { key: 'ArrowDown' });
      const firstRow = screen.getAllByRole('row')[1];
      expect(document.activeElement).toBe(firstRow);
    });

    it('announces sort changes to screen readers', async () => {
      render(<ResponsiveTable {...defaultProps} />);
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      
      const nameHeader = screen.getByText('名称');
      await userInteraction.clickButton(nameHeader);
      
      expect(statusElement).toHaveTextContent(/按名称升序排列/i);
    });

    it('provides row selection announcements', async () => {
      render(<ResponsiveTable {...defaultProps} rowSelection={{}} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await userInteraction.clickButton(checkboxes[1]);
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent(/已选择 1 行/i);
    });
  });

  describe('Performance', () => {
    it('virtualizes large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `项目 ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        createdAt: new Date().toISOString()
      }));
      
      render(
        <ResponsiveTable 
          {...defaultProps} 
          data={largeData}
          virtual={{ height: 400 }}
        />
      );
      
      expect(screen.getByTestId('virtual-table')).toBeInTheDocument();
      
      // 只渲染可见行
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThan(50); // 远少于1000行
    });

    it('memoizes column renders', () => {
      const renderSpy = jest.fn((value) => <span>{value}</span>);
      const columnsWithRender = [
        {
          ...mockColumns[1],
          render: renderSpy
        }
      ];
      
      const { rerender } = render(
        <ResponsiveTable 
          {...defaultProps} 
          columns={columnsWithRender}
        />
      );
      
      const initialCallCount = renderSpy.mock.calls.length;
      
      // 重新渲染相同数据
      rerender(
        <ResponsiveTable 
          {...defaultProps} 
          columns={columnsWithRender}
        />
      );
      
      // render函数不应该被重复调用
      expect(renderSpy.mock.calls.length).toBe(initialCallCount);
    });

    it('debounces search input', async () => {
      const onSearch = jest.fn();
      render(
        <ResponsiveTable 
          {...defaultProps} 
          showSearch
          onSearch={onSearch}
        />
      );
      
      const searchInput = screen.getByLabelText(/搜索名称/i);
      
      // 快速输入多个字符
      fireEvent.change(searchInput, { target: { value: '测' } });
      fireEvent.change(searchInput, { target: { value: '测试' } });
      fireEvent.change(searchInput, { target: { value: '测试项目' } });
      
      // 应该只调用一次（防抖）
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('name', '测试项目');
      }, { timeout: 1000 });
    });
  });
});