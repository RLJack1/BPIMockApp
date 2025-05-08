-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`user` (
  `Account_Number` INT NOT NULL,
  `First_Name` VARCHAR(45) NOT NULL,
  `Last_Name` VARCHAR(45) NOT NULL,
  `Birth_Date` DATE NOT NULL,
  `Email` VARCHAR(45) NOT NULL,
  `Balance` DECIMAL NOT NULL DEFAULT 0,
  PRIMARY KEY (`Account_Number`),
  UNIQUE INDEX `Account_Number_UNIQUE` (`Account_Number` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `mydb`.`payment_methods` (
  `Payment_ID` INT NOT NULL,
  `Payment_Method` VARCHAR(45) NULL,
  PRIMARY KEY (`Payment_ID`))
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `mydb`.`user_payment_junction` (
  `Payment_ID` INT NOT NULL,
  `Account_Number` INT NOT NULL,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;