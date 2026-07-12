-- Special Fare — seed data with REAL working password hashes
-- Run in Supabase → SQL Editor AFTER supabase_schema.sql
-- Admin login:  specialfare21@gmail.com / Kairavi@123
-- Demo login:   rahul@example.com / password123 (also supplier/agent accounts)
-- These are real scrypt(salt, hash) values that work with the app's verifyPassword().

-- Wipe ALL existing data (CASCADE handles foreign-key constraints, so order doesn't matter)
TRUNCATE TABLE "Payment", "Booking", "FixedDeparture", "Flight", "User", "Setting" RESTART IDENTITY CASCADE;

-- ============================================================
-- USERS (real scrypt hashes — login WILL work)
-- ============================================================
INSERT INTO "User" ("id","email","passwordHash","name","role","phone","company","balance","commissionRate","active","createdAt","updatedAt") VALUES
('admin_real','specialfare21@gmail.com','ccc8c42cb6047bc384cbc3acd3fb5892:7c474fe6c0c164c7756af370e4963cc536d1ad5fe4afd71bb7bd15d61983274bf684716c1528d32cb94e5f1a7de010785f7fd6c465c50d1e5c1ded842aee6764','Special Fare Admin','ADMIN',NULL,NULL,0,0,true,NOW(),NOW()),
('admin_demo','admin@specialfare.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','System Admin','ADMIN','+919900000001',NULL,0,0,true,NOW(),NOW()),
('supplier1','supplier@skywings.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','SkyWings Airlines','SUPPLIER','+919900000002','SkyWings Airlines',500000,0,true,NOW(),NOW()),
('supplier2','ops@nimbusair.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','Nimbus Air','SUPPLIER','+919900000003','Nimbus Air',320000,0,true,NOW(),NOW()),
('agent1','agent@flymart.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','FlyMart Travels','AGENT','+919900000004','FlyMart Travels',25000,8,true,NOW(),NOW()),
('agent2','agent@globetrotter.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','GlobeTrotter Agency','AGENT','+919900000005','GlobeTrotter Agency',18000,6,true,NOW(),NOW()),
('customer1','rahul@example.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','Rahul Sharma','CUSTOMER','+919900000006',NULL,5000,0,true,NOW(),NOW()),
('customer2','priya@example.com','f357bd7f813a87d6bea5b488ae1960bd:b091de8e3c9c56377d570a13f9cf3ee4c0b0f8f5bdb7cb6a19dc553a68bf8fb24b81e9903b9c82734d8b67663861106412ffceb4be0c3b6d92e73e069573596a','Priya Patel','CUSTOMER','+919900000007',NULL,0,0,true,NOW(),NOW());

-- ============================================================
-- FLIGHTS
-- ============================================================
INSERT INTO "Flight" ("id","flightNumber","airline","airlineCode","origin","originCity","destination","destinationCity","departureTime","arrivalTime","durationMins","aircraft","totalSeats","basePrice","cabinClass","baggage","supplierId","status","createdAt","updatedAt") VALUES
('fl1','SW 101','SkyWings Airlines','SW','DEL','New Delhi','BOM','Mumbai','06:00','08:15',135,'A320',180,4500,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl2','SW 204','SkyWings Airlines','SW','DEL','New Delhi','BLR','Bengaluru','09:30','12:20',170,'B737',160,6200,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl3','SW 310','SkyWings Airlines','SW','BOM','Mumbai','GOI','Goa','14:00','15:10',70,'A319',144,3200,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl4','NA 505','Nimbus Air','NA','BLR','Bengaluru','MAA','Chennai','07:15','08:20',65,'A320',150,2800,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl5','NA 612','Nimbus Air','NA','DEL','New Delhi','GOI','Goa','11:00','13:25',145,'A321',180,5400,'BUSINESS','30kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl6','NA 770','Nimbus Air','NA','BOM','Mumbai','HYD','Hyderabad','16:40','18:00',80,'B737',162,3600,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl7','SW 888','SkyWings Airlines','SW','BLR','Bengaluru','GOI','Goa','18:30','19:50',80,'A320',150,3400,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl8','SW 110','SkyWings Airlines','SW','CCU','Kolkata','DEL','New Delhi','08:00','10:20',140,'A320',170,5800,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl9','SW 230','SkyWings Airlines','SW','JAI','Jaipur','BOM','Mumbai','12:45','14:30',105,'A319',150,3800,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl10','SW 415','SkyWings Airlines','SW','LKO','Lucknow','BLR','Bengaluru','10:15','13:00',165,'B737',160,5400,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl11','NA 820','Nimbus Air','NA','COK','Kochi','MAA','Chennai','06:30','07:45',75,'A320',150,3100,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl12','NA 901','Nimbus Air','NA','TRV','Thiruvananthapuram','BLR','Bengaluru','15:20','16:35',75,'A319',144,3600,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl13','NA 640','Nimbus Air','NA','GAU','Guwahati','CCU','Kolkata','09:00','10:25',85,'A320',150,4200,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl14','NA 750','Nimbus Air','NA','PAT','Patna','DEL','New Delhi','13:10','15:00',110,'B737',160,4600,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW()),
('fl15','SW 560','SkyWings Airlines','SW','CJB','Coimbatore','HYD','Hyderabad','17:00','18:30',90,'A320',150,3900,'ECONOMY','20kg checked + 7kg cabin','supplier1','ACTIVE',NOW(),NOW()),
('fl16','NA 333','Nimbus Air','NA','IXB','Bagdogra','CCU','Kolkata','11:30','12:35',65,'A319',140,2900,'ECONOMY','20kg checked + 7kg cabin','supplier2','ACTIVE',NOW(),NOW());

-- ============================================================
-- FIXED DEPARTURES
-- ============================================================
INSERT INTO "FixedDeparture" ("id","flightId","departureDate","availableSeats","bookedSeats","costPrice","sellingPrice","markup","status","supplierId","createdAt","updatedAt") VALUES
('fd1','fl1',date_trunc('day', NOW() + interval '1 day'),40,6,4000,4699,699,'OPEN','supplier1',NOW(),NOW()),
('fd2','fl1',date_trunc('day', NOW() + interval '3 days'),35,5,4200,4899,699,'OPEN','supplier1',NOW(),NOW()),
('fd3','fl1',date_trunc('day', NOW() + interval '7 days'),50,7,4100,4799,699,'OPEN','supplier1',NOW(),NOW()),
('fd4','fl2',date_trunc('day', NOW() + interval '2 days'),30,4,5600,6499,899,'OPEN','supplier1',NOW(),NOW()),
('fd5','fl2',date_trunc('day', NOW() + interval '5 days'),28,4,5800,6799,999,'OPEN','supplier1',NOW(),NOW()),
('fd6','fl3',date_trunc('day', NOW() + interval '1 day'),60,9,2900,3399,499,'OPEN','supplier1',NOW(),NOW()),
('fd7','fl3',date_trunc('day', NOW() + interval '4 days'),55,8,3000,3599,599,'OPEN','supplier1',NOW(),NOW()),
('fd8','fl4',date_trunc('day', NOW() + interval '2 days'),70,10,2500,2999,499,'OPEN','supplier2',NOW(),NOW()),
('fd9','fl4',date_trunc('day', NOW() + interval '6 days'),65,9,2600,3099,499,'OPEN','supplier2',NOW(),NOW()),
('fd10','fl5',date_trunc('day', NOW() + interval '3 days'),22,3,5000,5999,999,'OPEN','supplier2',NOW(),NOW()),
('fd11','fl5',date_trunc('day', NOW() + interval '8 days'),25,3,5100,6199,1099,'OPEN','supplier2',NOW(),NOW()),
('fd12','fl6',date_trunc('day', NOW() + interval '1 day'),48,7,3200,3799,599,'OPEN','supplier2',NOW(),NOW()),
('fd13','fl6',date_trunc('day', NOW() + interval '5 days'),44,6,3300,3899,599,'OPEN','supplier2',NOW(),NOW()),
('fd14','fl7',date_trunc('day', NOW() + interval '2 days'),52,7,3000,3599,599,'OPEN','supplier1',NOW(),NOW()),
('fd15','fl7',date_trunc('day', NOW() + interval '9 days'),50,7,3100,3699,599,'OPEN','supplier1',NOW(),NOW()),
('fd16','fl8',date_trunc('day', NOW() + interval '1 day'),38,5,5200,5999,799,'OPEN','supplier1',NOW(),NOW()),
('fd17','fl8',date_trunc('day', NOW() + interval '4 days'),42,6,5300,6199,899,'OPEN','supplier1',NOW(),NOW()),
('fd18','fl9',date_trunc('day', NOW() + interval '2 days'),45,6,3400,3999,599,'OPEN','supplier1',NOW(),NOW()),
('fd19','fl10',date_trunc('day', NOW() + interval '3 days'),32,4,4900,5699,799,'OPEN','supplier1',NOW(),NOW()),
('fd20','fl11',date_trunc('day', NOW() + interval '1 day'),58,8,2800,3299,499,'OPEN','supplier2',NOW(),NOW()),
('fd21','fl11',date_trunc('day', NOW() + interval '6 days'),52,7,2900,3399,499,'OPEN','supplier2',NOW(),NOW()),
('fd22','fl12',date_trunc('day', NOW() + interval '2 days'),40,6,3300,3899,599,'OPEN','supplier2',NOW(),NOW()),
('fd23','fl13',date_trunc('day', NOW() + interval '3 days'),36,5,3800,4399,599,'OPEN','supplier2',NOW(),NOW()),
('fd24','fl13',date_trunc('day', NOW() + interval '7 days'),34,5,3900,4499,599,'OPEN','supplier2',NOW(),NOW()),
('fd25','fl14',date_trunc('day', NOW() + interval '1 day'),40,6,4200,4899,699,'OPEN','supplier2',NOW(),NOW()),
('fd26','fl15',date_trunc('day', NOW() + interval '4 days'),44,6,3500,4099,599,'OPEN','supplier1',NOW(),NOW()),
('fd27','fl16',date_trunc('day', NOW() + interval '2 days'),60,9,2600,3099,499,'OPEN','supplier2',NOW(),NOW()),
('fd28','fl16',date_trunc('day', NOW() + interval '5 days'),50,7,2400,2899,499,'OPEN','supplier2',NOW(),NOW());

-- ============================================================
-- SAMPLE BOOKINGS + PAYMENTS
-- ============================================================
INSERT INTO "Booking" ("id","reference","flightId","fixedDepartureId","userId","bookedByRole","passengerName","passengerEmail","passengerPhone","passengerType","seats","unitPrice","totalAmount","commission","status","paymentStatus","createdAt","updatedAt") VALUES
('bk1','SF1000','fl1','fd1','customer1','CUSTOMER','Primary Passenger','passenger@example.com','+919900012345','ADULT',1,4699,4699,0,'CONFIRMED','PAID',NOW(),NOW()),
('bk2','SF1001','fl3','fd6','agent1','AGENT','Walk-in Passenger','passenger@example.com','+919900012345','ADULT',2,3399,6798,543.84,'CONFIRMED','PAID',NOW(),NOW()),
('bk3','SF1002','fl6','fd12','customer2','CUSTOMER','Primary Passenger','passenger@example.com','+919900012345','ADULT',1,3799,3799,0,'CONFIRMED','PENDING',NOW(),NOW()),
('bk4','SF1003','fl4','fd8','agent2','AGENT','Walk-in Passenger','passenger@example.com','+919900012345','ADULT',3,2999,8997,539.82,'CONFIRMED','PAID',NOW(),NOW()),
('bk5','SF1004','fl1','fd2','customer1','CUSTOMER','Primary Passenger','passenger@example.com','+919900012345','ADULT',2,4899,9798,0,'CONFIRMED','PAID',NOW(),NOW());

INSERT INTO "Payment" ("id","bookingId","userId","amount","method","status","qrPayload","transactionId","createdAt","updatedAt") VALUES
('pm1','bk1','customer1',4699,'QR_SCAN','PAID','upi://pay?pa=specialfare@bank&pn=Special Fare&am=4699&tn=SF1000','TXN1',NOW(),NOW()),
('pm2','bk2','agent1',6798,'QR_SCAN','PAID','upi://pay?pa=specialfare@bank&pn=Special Fare&am=6798&tn=SF1001','TXN2',NOW(),NOW()),
('pm3','bk3','customer2',3799,'QR_SCAN','PENDING','upi://pay?pa=specialfare@bank&pn=Special Fare&am=3799&tn=SF1002',NULL,NOW(),NOW()),
('pm4','bk4','agent2',8997,'QR_SCAN','PAID','upi://pay?pa=specialfare@bank&pn=Special Fare&am=8997&tn=SF1003','TXN4',NOW(),NOW()),
('pm5','bk5','customer1',9798,'QR_SCAN','PAID','upi://pay?pa=specialfare@bank&pn=Special Fare&am=9798&tn=SF1004','TXN5',NOW(),NOW());
