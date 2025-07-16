CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

CREATE TABLE IF NOT EXISTS `mydb`.`user` (
  `Account_Number` INT(6) NOT NULL,
  `First_Name` VARCHAR(45) NOT NULL,
  `Last_Name` VARCHAR(45) NOT NULL,
  `Birth_Date` DATE NOT NULL,
  `Email` VARCHAR(45) NOT NULL,
  `Password` VARCHAR(255) NOT NULL,
  `Balance` DECIMAL NOT NULL DEFAULT 0,
  PRIMARY KEY (`Account_Number`),
  UNIQUE INDEX `Account_Number_UNIQUE` (`Account_Number` ASC) VISIBLE);

CREATE TABLE IF NOT EXISTS `mydb`.`payment_methods` (
  `Payment_ID` INT(1) NOT NULL,
  `Payment_Method` VARCHAR(45) NULL,
  PRIMARY KEY (`Payment_ID`));

CREATE TABLE IF NOT EXISTS `mydb`.`user_payment_junction` (
  `Payment_ID` INT(1) NOT NULL,
  `Account_Number` INT(6) NOT NULL,
  PRIMARY KEY (`Payment_ID`, `Account_Number`),
  INDEX `junctiontouser_idx` (`Account_Number` ASC) VISIBLE,
  CONSTRAINT `junctiontouser`
    FOREIGN KEY (`Account_Number`)
    REFERENCES `mydb`.`user` (`Account_Number`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `junctiontopayment`
    FOREIGN KEY (`Payment_ID`)
    REFERENCES `mydb`.`payment_methods` (`Payment_ID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);
    
CREATE TABLE IF NOT EXISTS `mydb`.`biller` (
  `Biller_ID` INT NOT NULL AUTO_INCREMENT,
  `Biller_Name` VARCHAR(45) NOT NULL,
  `Biller_Category` VARCHAR(45) NULL,
  PRIMARY KEY (`Biller_ID`),
  UNIQUE INDEX `Biller_Name_UNIQUE` (`Biller_Name` ASC) VISIBLE);

CREATE TABLE IF NOT EXISTS `mydb`.`bills` (
  `Bill_ID` INT NOT NULL AUTO_INCREMENT,
  `Account_Number` INT(6) NOT NULL,
  `Biller_ID` INT NOT NULL,
  `Bill_Amount` DECIMAL(10,2) NOT NULL,
  `Due_Date` DATE NOT NULL,
  `Bill_Status` ENUM('Pending', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
  `Bill_Reference` VARCHAR(45) NULL,
  `Created_Date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Bill_ID`),
  INDEX `billstouser_idx` (`Account_Number` ASC) VISIBLE,
  INDEX `billstobiller_idx` (`Biller_ID` ASC) VISIBLE,
  CONSTRAINT `billstouser`
    FOREIGN KEY (`Account_Number`)
    REFERENCES `mydb`.`user` (`Account_Number`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `billstobiller`
    FOREIGN KEY (`Biller_ID`)
    REFERENCES `mydb`.`biller` (`Biller_ID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);
    
 CREATE TABLE IF NOT EXISTS `mydb`.`transaction` (
  `Transaction_ID` INT NOT NULL AUTO_INCREMENT,
  `Account_Number` INT(6) NOT NULL,
  `Biller_ID` INT NOT NULL,
  `Transaction_Timestamp` TIMESTAMP NOT NULL,
  `Amount` DECIMAL(10,2) NOT NULL,
  `Payment_Method_ID` INT(1) NOT NULL,
  `Reference_Number` VARCHAR(45) NULL,
  PRIMARY KEY (`Transaction_ID`),
  INDEX `transactiontouser_idx` (`Account_Number` ASC) VISIBLE,
  INDEX `transactiontobiller_idx` (`Biller_ID` ASC) VISIBLE,
  INDEX `transactiontopaymentmethod_idx` (`Payment_Method_ID` ASC) VISIBLE,
  CONSTRAINT `transactiontouser`
    FOREIGN KEY (`Account_Number`)
    REFERENCES `mydb`.`user` (`Account_Number`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `transactiontobiller`
    FOREIGN KEY (`Biller_ID`)
    REFERENCES `mydb`.`biller` (`Biller_ID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `transactiontopaymentmethod`
    FOREIGN KEY (`Payment_Method_ID`)
    REFERENCES `mydb`.`payment_methods` (`Payment_ID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);


INSERT INTO `user` (`Account_Number`, `First_Name`, `Last_Name`, `Birth_Date`, `Email`, `Password`, `Balance`) VALUES
	('123456', 'Jack', 'Master', '2012-12-12', 'jackmaster@email.com', 'jackmaster', '10000'),
	('234567', 'Ivar', 'Ragnarsson', '2011-11-11', 'bonesless@viking.com', 'vikings', '11000'),
	('345678', 'Caitlyn', 'Kiramman', '2010-10-10', 'meandviforever@piltover.com', 'boomheadshot', '12000');
    
-- Insert billers
INSERT INTO `mydb`.`biller` (`Biller_Name`, `Biller_Category`) 
VALUES 
('Jeralco', 'Utilities'),
('Namila Water', 'Water'),
('Konverge ICT', 'Telecommunications');

-- Insert payment method
INSERT INTO `mydb`.`payment_methods` (`Payment_ID`, `Payment_Method`)
VALUES (1, 'Debit Card');

-- Sample transactions (assuming account number 123456 exists)
INSERT INTO `mydb`.`transaction` (`Transaction_ID`,`Account_Number`, `Biller_ID`, `Transaction_Timestamp`, `Amount`, `Payment_Method_ID`)VALUES
	('1', '123456', '1', '2025-05-14 16:00:00', '-14000', '1'),
	('2', '123456', '2', '2025-05-14 17:00:00', '-4000', '1'),
	('3', '123456', '3', '2025-05-13 14:00:00', '-5000', '1'),
	('4', '234567', '2', '2025-05-18 14:00:00', '-2000', '1'),
	('5', '234567', '1', '2025-05-20 14:00:00', '-4569', '1'),
	('6', '345678', '3', '2025-05-02 14:00:00', '-5000', '1'),
	('7', '345678', '3', '2025-04-09 14:00:00', '-5000', '1'),
	('8', '345678', '3', '2025-03-16 14:00:00', '-5000', '1');

  INSERT INTO `mydb`.`bills` (`Account_Number`, `Biller_ID`, `Bill_Amount`, `Due_Date`, `Bill_Reference`)
VALUES 
(123456, (SELECT Biller_ID FROM biller WHERE Biller_Name = 'Jeralco'), 2500.00, '2025-06-15', 'ref1'),
(123456, (SELECT Biller_ID FROM biller WHERE Biller_Name = 'Namila Water'), 1800.00, '2025-06-10', 'ref1'),
(123456, (SELECT Biller_ID FROM biller WHERE Biller_Name = 'Konverge ICT'), 3200.00, '2025-06-20', 'ref1'),
(234567, (SELECT Biller_ID FROM biller WHERE Biller_Name = 'Jeralco'), 2800.00, '2025-06-12', 'ref1'),
(234567, (SELECT Biller_ID FROM biller WHERE Biller_Name = 'Namila Water'), 1950.00, '2025-06-08', 'ref1');