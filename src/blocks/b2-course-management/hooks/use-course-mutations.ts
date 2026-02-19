'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  transitionStatus,
  updatePriority,
  reorderCourses,
  bulkUpdateStatus,
  bulkUpdatePriority,
  bulkDeleteCourses,
} from '../actions/course-actions';
import type { CreateCourseInput, UpdateCourseInput } from '../lib/course-validation';
import type { CourseStatus, CoursePriority } from '@/lib/types';
import { toast } from 'sonner';

export function useCourseMutations() {
  const queryClient = useQueryClient();

  const invalidateCourses = () => {
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const createCourseMutation = useMutation({
    mutationFn: (data: CreateCourseInput) => createCourse(data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Course created successfully');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCourseInput }) =>
      updateCourse(id, data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Course updated successfully');
      invalidateCourses();
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['course', result.data.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Course deleted');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const transitionStatusMutation = useMutation({
    mutationFn: ({
      courseId,
      newStatus,
      reason,
    }: {
      courseId: string;
      newStatus: CourseStatus;
      reason?: string;
    }) => transitionStatus(courseId, newStatus, reason),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Status updated');
      invalidateCourses();
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['course', result.data.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: CoursePriority }) =>
      updatePriority(id, priority),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Priority updated');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reorderCoursesMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCourses(orderedIds),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: CourseStatus }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Courses updated');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkUpdatePriorityMutation = useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: CoursePriority }) =>
      bulkUpdatePriority(ids, priority),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Priority updated for selected courses');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteCourses(ids),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Courses deleted');
      invalidateCourses();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createCourse: createCourseMutation,
    updateCourse: updateCourseMutation,
    deleteCourse: deleteCourseMutation,
    transitionStatus: transitionStatusMutation,
    updatePriority: updatePriorityMutation,
    reorderCourses: reorderCoursesMutation,
    bulkUpdateStatus: bulkUpdateStatusMutation,
    bulkUpdatePriority: bulkUpdatePriorityMutation,
    bulkDelete: bulkDeleteMutation,
    isLoading:
      createCourseMutation.isPending ||
      updateCourseMutation.isPending ||
      deleteCourseMutation.isPending ||
      transitionStatusMutation.isPending,
  };
}
