import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { mockSetSelectedCourseIds, mockUseChartCourseFilter } = vi.hoisted(() => ({
  mockSetSelectedCourseIds: vi.fn(),
  mockUseChartCourseFilter: vi.fn(() => ({
    selectedCourseIds: [] as string[],
    setSelectedCourseIds: vi.fn(),
    courses: [
      { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
      { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
      { id: 'c3', title: 'TypeScript Deep Dive', color: '#16a34a' },
    ],
    isAllSelected: true,
    isLoading: false,
  })),
}));

vi.mock('../hooks/use-chart-course-filter', () => ({
  useChartCourseFilter: () => mockUseChartCourseFilter(),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => <div data-testid="popover" data-open={open}>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.()}
      data-testid="checkbox"
      {...props}
    />
  ),
}));

import { ChartCourseFilter } from './chart-course-filter';

describe('ChartCourseFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: [],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
        { id: 'c3', title: 'TypeScript Deep Dive', color: '#16a34a' },
      ],
      isAllSelected: true,
      isLoading: false,
    });
  });

  it('shows "All Courses" when all courses are selected', () => {
    render(<ChartCourseFilter />);
    // The trigger button should say "All Courses"
    const buttons = screen.getAllByText('All Courses');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows count when specific courses are selected', () => {
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: ['c1', 'c2'],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
        { id: 'c3', title: 'TypeScript Deep Dive', color: '#16a34a' },
      ],
      isAllSelected: false,
      isLoading: false,
    });
    render(<ChartCourseFilter />);
    expect(screen.getByText('2 Courses')).toBeDefined();
  });

  it('shows singular "Course" when only one course is selected', () => {
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: ['c1'],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
      ],
      isAllSelected: false,
      isLoading: false,
    });
    render(<ChartCourseFilter />);
    expect(screen.getByText('1 Course')).toBeDefined();
  });

  it('renders all course titles in the dropdown', () => {
    render(<ChartCourseFilter />);
    expect(screen.getByText('React Fundamentals')).toBeDefined();
    expect(screen.getByText('Node.js Mastery')).toBeDefined();
    expect(screen.getByText('TypeScript Deep Dive')).toBeDefined();
  });

  it('clears selection when "All Courses" option is clicked', () => {
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: ['c1'],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
      ],
      isAllSelected: false,
      isLoading: false,
    });
    render(<ChartCourseFilter />);
    // The "All Courses" option in the dropdown list is a button
    const allCoursesOptions = screen.getAllByText('All Courses');
    // Click the dropdown option (not the trigger button)
    fireEvent.click(allCoursesOptions[0]);
    expect(mockSetSelectedCourseIds).toHaveBeenCalledWith([]);
  });

  it('toggles a course when its checkbox changes', () => {
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: ['c1'],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
      ],
      isAllSelected: false,
      isLoading: false,
    });
    render(<ChartCourseFilter />);
    const checkboxes = screen.getAllByTestId('checkbox');
    // Click the second checkbox (Node.js Mastery) to add it
    fireEvent.click(checkboxes[1]);
    expect(mockSetSelectedCourseIds).toHaveBeenCalledWith(['c1', 'c2']);
  });

  it('removes a course from selection when already selected', () => {
    mockUseChartCourseFilter.mockReturnValue({
      selectedCourseIds: ['c1', 'c2'],
      setSelectedCourseIds: mockSetSelectedCourseIds,
      courses: [
        { id: 'c1', title: 'React Fundamentals', color: '#2563eb' },
        { id: 'c2', title: 'Node.js Mastery', color: '#dc2626' },
      ],
      isAllSelected: false,
      isLoading: false,
    });
    render(<ChartCourseFilter />);
    const checkboxes = screen.getAllByTestId('checkbox');
    // Click first checkbox (React Fundamentals) to remove it
    fireEvent.click(checkboxes[0]);
    expect(mockSetSelectedCourseIds).toHaveBeenCalledWith(['c2']);
  });

  it('shows checkboxes as checked for selected courses when isAllSelected', () => {
    render(<ChartCourseFilter />);
    const checkboxes = screen.getAllByTestId('checkbox');
    // When isAllSelected, all checkboxes should be checked
    checkboxes.forEach((cb) => {
      expect((cb as HTMLInputElement).checked).toBe(true);
    });
  });
});
