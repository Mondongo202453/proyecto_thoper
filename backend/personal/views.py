from rest_framework import viewsets, permissions
from .models import Personal, StaffAssignment
from .serializers import PersonalSerializer, StaffAssignmentSerializer

class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.all()
    serializer_class = PersonalSerializer
    permission_classes = [permissions.IsAdminUser]

class StaffAssignmentViewSet(viewsets.ModelViewSet):
    queryset = StaffAssignment.objects.all()
    serializer_class = StaffAssignmentSerializer
    
    def get_permissions(self):
        if self.request.user.role_id == 1: # Admin
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()] # Default restrict
    
    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1: # Admin
            return StaffAssignment.objects.all()
        # RF24: Staff can see their own assignments
        if user.role_id == 3: # Staff
            return StaffAssignment.objects.filter(personal__usuario=user)
        return StaffAssignment.objects.none()
