# Generated by Selenium IDE
import pytest
import time
import json
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.chrome.options import Options

class TestExecutecells(unittest.TestCase):
  def test_executecells(self):
    options = webdriver.ChromeOptions()
    self.driver = webdriver.Remote(
                command_executor = 'http://selenium:4444/wd/hub',
                options = options
             )

    # options = Options()
    # options.add_argument('--headless')
    # options.add_argument("--no-sandbox")
    # self.driver = webdriver.Chrome()
    self.vars = {}
    self.driver.get("http://notebook:8888/nbclassic/notebooks/work/qp_view.ipynb")
    self.driver.set_window_size(1360, 998)
    self.driver.find_element(By.CSS_SELECTOR, ".toolbar-btn-label").click()
    self.driver.execute_script("window.scrollTo(0,0)")
    self.driver.find_element(By.CSS_SELECTOR, ".toolbar-btn-label").click()
    self.driver.execute_script("window.scrollTo(0,0)")
    self.driver.find_element(By.CSS_SELECTOR, ".toolbar-btn-label").click()
    # take a screenshot of the current page
    self.driver.save_screenshot('qp_view.png')
    self.driver.quit()
  