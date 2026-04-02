import { useState, useEffect } from 'react';

export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    if (!targetDate) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function parseCustomDate(dateStr) {
  // Parse format: "30 Mar 23:00 WIB" or "30 Mar 13:00 WIB"
  if (!dateStr || typeof dateStr !== 'string') return null;

  try {
    // Remove timezone (WIB, WITA, WIT, etc)
    const cleanStr = dateStr.replace(/\s+(WIB|WITA|WIT|GMT|UTC).*$/i, '').trim();
    
    // Split into parts: "30 Mar 23:00"
    const parts = cleanStr.split(' ');
    if (parts.length < 3) return null;

    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const time = parts[2];

    // Month mapping
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = months[monthStr];
    if (month === undefined) return null;

    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    // Get current date/time
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Create date object for this year
    const targetDate = new Date(currentYear, month, day, hours, minutes, 0);
    
    // Only move to next year if the date is clearly in the past (more than 1 day ago)
    const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
    if (targetDate.getTime() < oneDayAgo) {
      targetDate.setFullYear(currentYear + 1);
    }

    return targetDate.getTime();
  } catch (error) {
    console.error('Error parsing custom date:', error, dateStr);
    return null;
  }
}

function calculateTimeLeft(targetDate) {
  if (!targetDate) return null;

  try {
    const now = new Date().getTime();
    
    let target;
    
    // If it's already a timestamp
    if (typeof targetDate === 'number') {
      target = targetDate;
    } else {
      // Try custom parser first for "30 Mar 23:00 WIB" format
      target = parseCustomDate(targetDate);
      
      // If custom parser failed, try standard Date parsing
      if (!target) {
        target = new Date(targetDate).getTime();
      }
    }
    
    // Check if parsing was successful
    if (isNaN(target)) {
      console.error('Invalid date format:', targetDate);
      return null;
    }

    const difference = target - now;

    if (difference <= 0) {
      return { expired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, expired: false };
  } catch (error) {
    console.error('Error calculating countdown:', error, targetDate);
    return null;
  }
}

export function formatCountdown(timeLeft) {
  if (!timeLeft || timeLeft.expired) return null;

  const parts = [];
  
  if (timeLeft.days > 0) {
    parts.push(`${timeLeft.days}h`);
  }
  if (timeLeft.hours > 0 || timeLeft.days > 0) {
    parts.push(`${timeLeft.hours}j`);
  }
  parts.push(`${String(timeLeft.minutes).padStart(2, '0')}m`);
  parts.push(`${String(timeLeft.seconds).padStart(2, '0')}d`);

  return parts.join(' ');
}
