export interface FinanceLine { salaryPlayers:number; salaryStaff:number; sponsor:number; scrimCost:number; facilityOpex:number }

export function weeklyFinanceUpdate(fin:{ cash:number; revenueYTD:number; expensesYTD:number }, line:FinanceLine){
  const revenue = line.sponsor;
  const expenses = line.salaryPlayers + line.salaryStaff + line.scrimCost + line.facilityOpex;
  fin.cash += revenue - expenses;
  fin.revenueYTD += revenue;
  fin.expensesYTD += expenses;
  return fin;
}
