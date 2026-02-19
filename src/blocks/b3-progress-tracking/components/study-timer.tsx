'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTimer } from '../hooks/use-timer';
import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { TimerCourseSelect } from './timer-course-select';
import { ModuleChecklist } from './module-checklist';

export function StudyTimer() {
  const { state, start, pause, resume, stop, reset, recoverySession, dismissRecovery } =
    useTimer();
  const queryClient = useQueryClient();

  const [courseId, setCourseId] = useState<string | null>(
    state.courseId
  );
  const [modulesCompleted, setModulesCompleted] = useState(0);
  const [notes, setNotes] = useState('');
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = async () => {
    if (!courseId) return;
    try {
      await start(courseId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const session = await stop(notes || undefined, modulesCompleted);
      if (session) {
        toast.success(
          `Session saved: ${session.duration_minutes} minutes`
        );
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['streak'] });
        queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
      }
      setModulesCompleted(0);
      setNotes('');
      setCourseId(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRecoveryResume = () => {
    dismissRecovery();
    resume();
  };

  const handleRecoveryStop = async () => {
    dismissRecovery();
    await handleStop();
  };

  const handleRecoveryDiscard = () => {
    reset();
  };

  const isTimerActive = state.status !== 'idle';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Study Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <TimerCourseSelect
            selectedCourseId={state.courseId ?? courseId}
            onSelect={setCourseId}
            disabled={isTimerActive}
          />

          <div className="flex justify-center py-8">
            <TimerDisplay
              elapsedSeconds={state.elapsedSeconds}
              isRunning={state.status === 'running'}
            />
          </div>

          <TimerControls
            status={state.status}
            onStart={handleStart}
            onPause={pause}
            onResume={resume}
            onStop={handleStop}
            courseSelected={!!(state.courseId ?? courseId)}
            isStopLoading={isStopping}
          />

          {isTimerActive && (
            <div className="space-y-6 pt-4 border-t">
              <ModuleChecklist
                count={modulesCompleted}
                onChange={setModulesCompleted}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you work on this session?"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {notes.length}/500
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Dialog */}
      <Dialog
        open={!!recoverySession}
        onOpenChange={() => dismissRecovery()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Active Session Found</DialogTitle>
            <DialogDescription>
              You have an active timer session (
              {Math.round(state.elapsedSeconds / 60)} minutes). What would you
              like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRecoveryDiscard}>
              Discard
            </Button>
            <Button variant="destructive" onClick={handleRecoveryStop}>
              Stop & Save
            </Button>
            <Button onClick={handleRecoveryResume}>Resume Timer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
