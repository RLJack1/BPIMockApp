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
('Namila Water', 'Utilities'),
('Konverge ICT', 'Telecommunications');

-- Insert payment method
INSERT INTO `mydb`.`payment_methods` (`Payment_ID`, `Payment_Method`)
VALUES (1, 'Debit Card');

-- Sample transactions (assuming account number 123456 exists)
INSERT INTO `mydb`.`transaction` (`Account_Number`, `Biller_ID`, `Transaction_Date`, `Transaction_Time`, `Amount`, `Payment_Method_ID`)` (`Transaction_ID`, `Account_Number`, `Biller_ID`, `Transaction_Timestamp`, `Amount`, `Payment_Method_ID`) VALUES
	('1', '123456', '1', '2025-05-14 4:00:00 PM', '-14000', '1'),
	('2', '123456', '2', '2025-05-14 5:00:00 PM', '-4000', '1'),
	('3', '123456', '3', '2025-05-13 2:00:00 PM', '-5000', '1'),
	('4', '234567', '2', '2025-05-18 2:00:00 PM', '-2000', '1'),
	('5', '234567', '1', '2025-05-20 2:00:00 PM', '-4569', '1'),
	('6', '345678', '3', '2025-05-02 2:00:00 PM', '-5000', '1'),
	('7', '345678', '3', '2025-04-09 2:00:00 PM', '-5000', '1'),
	('8', '345678', '3', '2025-03-16 2:00:00 PM', '-5000', '1');