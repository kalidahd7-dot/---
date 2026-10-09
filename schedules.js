'use strict';

const TIMEZONE = process.env.TIMEZONE || 'Africa/Addis_Ababa';

const SCHEDULES = [
  { id: 'male_morning', gender: 'male', period: 'morning', days: ['Tuesday', 'Wednesday', 'Thursday'], start: '09:00', end: '12:00' },
  { id: 'male_afternoon', gender: 'male', period: 'afternoon', days: ['Tuesday', 'Wednesday', 'Thursday'], start: '14:00', end: '15:30' },
  { id: 'male_night', gender: 'male', period: 'night', days: ['Tuesday', 'Wednesday', 'Thursday'], start: '21:00', end: '23:00' },
  { id: 'female_morning', gender: 'female', period: 'morning', days: ['Saturday', 'Sunday', 'Monday'], start: '09:00', end: '12:00' },
  { id: 'female_afternoon', gender: 'female', period: 'afternoon', days: ['Saturday', 'Sunday', 'Monday'], start: '14:00', end: '15:30' },
  { id: 'female_night', gender: 'female', period: 'night', days: ['Saturday', 'Sunday', 'Monday'], start: '21:00', end: '23:00' }
];

function getSchedule(id) { return SCHEDULES.find(s => s.id === id) || null; }

module.exports = { TIMEZONE, SCHEDULES, getSchedule };
