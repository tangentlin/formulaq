/**
 * ValidationStatus component for displaying formula validation results.
 *
 * Displays a compact status bar below the formula editor showing:
 * - Idle state: Empty or grayed out
 * - Validating state: Spinner with "Validating..." text
 * - Valid state: Green checkmark with "Formula is valid"
 * - Invalid state: Red X icon with error message and optional position
 *
 * @module
 */

import { Box, CircularProgress, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import React from 'react';
import type { ValidationStatusProps, ErrorPositionInfo } from './validation-status.types';

/**
 * Formats the error position as a human-readable string.
 *
 * @param position - The error position information
 * @returns A formatted string like "Line 1, Column 5"
 */
function formatErrorPosition(position: ErrorPositionInfo): string {
  return `Line ${position.line}, Column ${position.column}`;
}

/**
 * Builds the complete error message including position information if available.
 *
 * @param errorMessage - The error message to display
 * @param errorPosition - Optional position information
 * @returns The complete error message string
 */
function buildErrorDisplayMessage(
  errorMessage: string | undefined,
  errorPosition: ErrorPositionInfo | undefined,
): string {
  if (!errorMessage) {
    return 'Validation error';
  }

  if (!errorPosition) {
    return errorMessage;
  }

  return `${formatErrorPosition(errorPosition)}: ${errorMessage}`;
}

/**
 * Component height for the status bar.
 * Designed to fit compactly below the editor (~32-40px).
 */
const STATUS_BAR_HEIGHT = 36;

/**
 * Icon size for status indicators.
 */
const ICON_SIZE = 18;

/**
 * Spinner size for the validating state.
 */
const SPINNER_SIZE = 16;

/**
 * Renders the idle state content (empty/grayed out).
 *
 * @returns The idle state JSX element
 */
function IdleContent(): React.ReactElement {
  return (
    <Typography
      variant="body2"
      sx={{
        color: 'text.disabled',
        fontStyle: 'italic',
      }}
    >
      Enter a formula to validate
    </Typography>
  );
}

/**
 * Renders the validating state content with spinner.
 *
 * @returns The validating state JSX element
 */
function ValidatingContent(): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CircularProgress size={SPINNER_SIZE} color="inherit" />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Validating...
      </Typography>
    </Box>
  );
}

/**
 * Renders the valid state content with green checkmark.
 *
 * @returns The valid state JSX element
 */
function ValidContent(): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <CheckCircleIcon
        sx={{
          fontSize: ICON_SIZE,
          color: 'success.main',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'success.main',
          fontWeight: 500,
        }}
      >
        Formula is valid
      </Typography>
    </Box>
  );
}

/**
 * Props for the InvalidContent component.
 */
interface InvalidContentProps {
  readonly errorMessage: string | undefined;
  readonly errorPosition: ErrorPositionInfo | undefined;
}

/**
 * Renders the invalid state content with red X icon and error message.
 *
 * @param props - The component props
 * @returns The invalid state JSX element
 */
function InvalidContent(props: InvalidContentProps): React.ReactElement {
  const displayMessage = buildErrorDisplayMessage(props.errorMessage, props.errorPosition);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        flex: 1,
      }}
    >
      <ErrorIcon
        sx={{
          fontSize: ICON_SIZE,
          color: 'error.main',
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'error.main',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={displayMessage}
      >
        {displayMessage}
      </Typography>
    </Box>
  );
}

/**
 * ValidationStatus component displays the current validation state of a formula.
 *
 * This component is designed to be placed below the formula editor and provides
 * visual feedback about whether the formula is valid, invalid, or being validated.
 *
 * @param props - The component props
 * @returns The rendered ValidationStatus component
 *
 * @example
 * ```tsx
 * // Idle state (initial)
 * <ValidationStatus status="idle" />
 *
 * // Validating state
 * <ValidationStatus status="validating" />
 *
 * // Valid state
 * <ValidationStatus status="valid" />
 *
 * // Invalid state with error
 * <ValidationStatus
 *   status="invalid"
 *   errorMessage="Unknown variable @foo"
 *   errorPosition={{ line: 1, column: 5 }}
 * />
 * ```
 */
export function ValidationStatus(props: ValidationStatusProps): React.ReactElement {
  function renderContent(): React.ReactElement {
    switch (props.status) {
      case 'idle':
        return <IdleContent />;
      case 'validating':
        return <ValidatingContent />;
      case 'valid':
        return <ValidContent />;
      case 'invalid':
        return (
          <InvalidContent errorMessage={props.errorMessage} errorPosition={props.errorPosition} />
        );
    }
  }

  return (
    <Box
      sx={{
        height: STATUS_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        minWidth: 0,
      }}
      role="status"
      aria-live="polite"
    >
      {renderContent()}
    </Box>
  );
}
