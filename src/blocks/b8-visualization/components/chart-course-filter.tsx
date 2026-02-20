'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useChartCourseFilter } from '../hooks/use-chart-course-filter';

export function ChartCourseFilter() {
  const { selectedCourseIds, setSelectedCourseIds, courses, isAllSelected } =
    useChartCourseFilter();
  const [open, setOpen] = useState(false);

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const selectAll = () => setSelectedCourseIds([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Filter className="h-3.5 w-3.5 mr-1" />
          {isAllSelected
            ? 'All Courses'
            : `${selectedCourseIds.length} Course${selectedCourseIds.length !== 1 ? 's' : ''}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
          >
            <div
              className="h-2.5 w-2.5 rounded-full bg-muted-foreground"
            />
            <span className={isAllSelected ? 'font-medium' : ''}>All Courses</span>
          </button>
          {courses.map((course) => {
            const isSelected =
              isAllSelected || selectedCourseIds.includes(course.id);
            return (
              <label
                key={course.id}
                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleCourse(course.id)}
                  className="h-3.5 w-3.5"
                />
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: course.color }}
                />
                <span className="truncate">{course.title}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
