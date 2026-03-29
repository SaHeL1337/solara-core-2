import { prisma } from "../../lib/prisma";
import { MissionType, FleetMovementStatus } from "../../generated/prisma";

export class StatisticsService {
  async getMiningStatistics(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Fetch all successfully completed MINE missions with resources in the last 7 days
    const miningMovements = await (prisma as any).fleetMovement.findMany({
      where: {
        userId,
        missionType: MissionType.MINE,
        status: FleetMovementStatus.COMPLETED,
        arrivalTime: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        resources: true,
      },
      orderBy: {
        arrivalTime: "asc",
      },
    });

    // Initialize chart data
    const chartDataMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      chartDataMap[ds] = 0;
    }

    const todayStats = {
      asteroidsMined: 0,
      titanium: 0,
      silicate: 0,
      isotope: 0,
    };
    let totalYesterday = 0;
    let totalToday = 0;

    miningMovements.forEach((mov: any) => {
      const arrDay = new Date(mov.arrivalTime);
      const dayStr = arrDay.toISOString().split("T")[0];

      let movTotal = 0;
      mov.resources.forEach((r: any) => {
        movTotal += r.amount;
        if (arrDay >= today) {
           if (r.type === 'TITANIUM') todayStats.titanium += r.amount;
           if (r.type === 'SILICATE') todayStats.silicate += r.amount;
           if (r.type === 'ISOTOPE') todayStats.isotope += r.amount;
        }
      });

      if (chartDataMap[dayStr] !== undefined) {
        chartDataMap[dayStr] += movTotal;
      }

      if (arrDay >= today) {
        todayStats.asteroidsMined += 1;
        totalToday += movTotal;
      } else if (arrDay >= yesterday && arrDay < today) {
        totalYesterday += movTotal;
      }
    });

    const chartData = Object.keys(chartDataMap).map(date => ({
      date,
      totalMined: chartDataMap[date]
    }));

    let percentChange = 0;
    if (totalYesterday === 0) {
      percentChange = totalToday > 0 ? 100 : 0;
    } else {
      percentChange = ((totalToday - totalYesterday) / totalYesterday) * 100;
    }

    return {
      today: todayStats,
      totalToday,
      totalYesterday,
      percentChange: Math.round(percentChange * 10) / 10, // Round to 1 decimal
      chartData
    };
  }
}

export const statisticsService = new StatisticsService();
