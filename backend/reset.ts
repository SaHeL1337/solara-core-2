import { prisma } from './src/lib/prisma';

prisma.spaceObject.updateMany({ data: { titanium: 0, silicate: 0, isotope: 0 } })
  .then((res: any) => console.log('Updated', res.count, 'space objects'))
  .catch((e: any) => console.error(e))
  .finally(() => prisma.$disconnect());
