package com.lws.staff_management.performance.dto;

public class EmployeeOptionDto {
    private Long optionId;
    private String optionText;
    private int displayOrder;

    public EmployeeOptionDto() {}

    public EmployeeOptionDto(Long optionId, String optionText, int displayOrder) {
        this.optionId = optionId;
        this.optionText = optionText;
        this.displayOrder = displayOrder;
    }

    public Long getOptionId() { return optionId; }
    public void setOptionId(Long optionId) { this.optionId = optionId; }

    public String getOptionText() { return optionText; }
    public void setOptionText(String optionText) { this.optionText = optionText; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
