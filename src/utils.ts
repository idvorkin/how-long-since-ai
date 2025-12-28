export interface TimeSince {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export function calculateTimeSince(eventDate: Date): TimeSince {
  const now = new Date();
  const diffTime = now.getTime() - eventDate.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - eventDate.getFullYear();
  let months = now.getMonth() - eventDate.getMonth();
  let days = now.getDate() - eventDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days, totalDays };
}
