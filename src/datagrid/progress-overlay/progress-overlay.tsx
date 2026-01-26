/**
 * ProgressOverlay component for displaying evaluation progress.
 *
 * An inline overlay that shows evaluation progress for large datasets.
 * Displays a linear progress bar with percentage, row count text,
 * and an optional cancel button.
 *
 * Features:
 * - Semi-transparent overlay background
 * - Centered content container
 * - Linear progress bar with percentage
 * - "Processing: X / Y rows (Z%)" text
 * - Optional Cancel button
 * - Visibility controlled by parent (fade in/out handled externally)
 *
 * @module
 */

import { Box, Button, LinearProgress, Typography } from '@mui/material';
import React from 'react';
import type { ProgressOverlayProps } from './progress-overlay.types';

/**
 * Background color for the semi-transparent overlay.
 */
const OVERLAY_BACKGROUND_COLOR = 'rgba(255, 255, 255, 0.85)';

/**
 * Width of the progress content container.
 */
const CONTENT_WIDTH = 400;

/**
 * Formats a number with locale-appropriate thousand separators.
 *
 * @param value - The number to format
 * @returns The formatted number string
 */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Calculates the percentage of completion.
 *
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @returns The percentage as a number between 0 and 100
 */
function calculatePercentage(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const rawPercentage = (completed / total) * 100;
  return Math.min(100, Math.max(0, rawPercentage));
}

/**
 * Builds the progress text message.
 *
 * @param completed - Number of completed rows
 * @param total - Total number of rows
 * @param percentage - The percentage of completion
 * @returns The formatted progress text
 */
function buildProgressText(completed: number, total: number, percentage: number): string {
  const formattedCompleted = formatNumber(completed);
  const formattedTotal = formatNumber(total);
  const roundedPercentage = Math.round(percentage);
  return `Processing: ${formattedCompleted} / ${formattedTotal} rows (${roundedPercentage}%)`;
}

/**
 * Renders the progress bar section.
 *
 * @param percentage - The current percentage of completion
 * @returns The progress bar element
 */
function ProgressBar(props: { readonly percentage: number }): React.ReactElement {
  return (
    <LinearProgress
      variant="determinate"
      value={props.percentage}
      sx={{
        width: '100%',
        height: 8,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        '& .MuiLinearProgress-bar': {
          borderRadius: 1,
        },
      }}
    />
  );
}

/**
 * Renders the cancel button.
 *
 * @param onCancel - The cancel callback
 * @returns The cancel button element
 */
function CancelButton(props: { readonly onCancel: () => void }): React.ReactElement {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={props.onCancel}
      sx={{
        mt: 2,
        minWidth: 80,
      }}
    >
      Cancel
    </Button>
  );
}

/**
 * ProgressOverlay component displays evaluation progress for large datasets.
 *
 * This component renders a semi-transparent overlay with centered progress
 * information. It shows a linear progress bar, the number of processed rows,
 * and optionally a cancel button.
 *
 * The visibility and fade behavior is controlled by the parent component
 * through the `visible` prop. When not visible, the component returns null.
 *
 * @param props - The component props
 * @returns The rendered ProgressOverlay component, or null if not visible
 *
 * @example
 * ```tsx
 * // Basic usage with 50% progress
 * <ProgressOverlay
 *   visible={true}
 *   completed={50000}
 *   total={100000}
 * />
 *
 * // With cancel button
 * <ProgressOverlay
 *   visible={true}
 *   completed={25000}
 *   total={100000}
 *   onCancel={() => abortController.abort()}
 * />
 *
 * // Hidden overlay
 * <ProgressOverlay
 *   visible={false}
 *   completed={0}
 *   total={100}
 * />
 * ```
 */
export function ProgressOverlay(props: ProgressOverlayProps): React.ReactElement | null {
  if (!props.visible) {
    return null;
  }

  const percentage = calculatePercentage(props.completed, props.total);
  const progressText = buildProgressText(props.completed, props.total, percentage);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: OVERLAY_BACKGROUND_COLOR,
        zIndex: 10,
      }}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Evaluation progress"
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: CONTENT_WIDTH,
          maxWidth: '90%',
          p: 3,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            fontWeight: 500,
            color: 'text.primary',
            textAlign: 'center',
          }}
        >
          {progressText}
        </Typography>
        <ProgressBar percentage={percentage} />
        {props.onCancel !== undefined && <CancelButton onCancel={props.onCancel} />}
      </Box>
    </Box>
  );
}
